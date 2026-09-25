import { DestroyRef, InjectionToken, Service, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IMessage } from '@stomp/stompjs';
import { RxStomp, RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import { BehaviorSubject, EMPTY, Observable, Subject, Subscription, interval, switchMap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { TenantContextService } from '../../tenant/services/tenant-context.service';
import {
  BoardError,
  BoardMessage,
  CommentAddedEvent,
  ConnectionStatus,
  ItemMovedEvent,
  ItemsReorderedEvent,
  OnlineUser,
  PresenceEvent,
  StatusChangedEvent,
  UserTypingEvent,
} from '../models/board.models';

/** The part of `RxStomp` this service uses, so tests can stand in for the network. */
export type StompTransport = Pick<
  RxStomp,
  'configure' | 'activate' | 'deactivate' | 'publish' | 'watch' | 'connectionState$'
>;

export const STOMP_TRANSPORT_FACTORY = new InjectionToken<() => StompTransport>('STOMP_TRANSPORT_FACTORY', {
  factory: () => () => new RxStomp(),
});

/** How long to wait before trying again after the connection drops. */
export const RECONNECT_DELAY_MS = 5000;
/** While there is no live connection, consumers are asked to reload from the API this often. */
export const POLL_INTERVAL_MS = 15000;
/** After announcing itself, how long to wait for its own arrival to be echoed back before announcing again. */
export const ANNOUNCE_RETRY_MS = 2000;
/** How long a board stays open after its last screen leaves, so moving between screens of a project keeps the connection. */
export const RELEASE_GRACE_MS = 2000;
const MAX_ANNOUNCEMENTS = 3;
const HEARTBEAT_MS = 10000;

const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * The live connection to one project's board: `/ws/tenant/{tenantId}/project/{projectCode}/board` over STOMP. It turns what
 * the server broadcasts into one stream per event type, keeps the connection status and who is online as signals, and sends
 * this user's changes.
 * <p>
 * The socket is an accelerator, never the only way to get data: while it is not connected, {@link refresh$} fires
 * periodically so screens reload from the API, and once more when the connection comes back (events sent in between are
 * not replayed). Sending helpers return `false` when there is no live connection, so the caller can use HTTP instead.
 */
@Service()
export class BoardWebSocketService {
  private readonly auth = inject(AuthService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly createTransport = inject(STOMP_TRANSPORT_FACTORY);

  private readonly status = signal<ConnectionStatus>('offline');
  private readonly online = signal<readonly OnlineUser[]>([]);
  private readonly statusChanges = new BehaviorSubject<ConnectionStatus>('offline');

  /** Whether the live connection is up. Always show it: a board that is quietly stale is worse than one that says so. */
  readonly connectionStatus = this.status.asReadonly();
  readonly usersOnline = this.online.asReadonly();

  private readonly statusChangedSubject = new Subject<StatusChangedEvent>();
  private readonly itemMovedSubject = new Subject<ItemMovedEvent>();
  private readonly itemsReorderedSubject = new Subject<ItemsReorderedEvent>();
  private readonly commentAddedSubject = new Subject<CommentAddedEvent>();
  private readonly userTypingSubject = new Subject<UserTypingEvent>();
  private readonly userConnectedSubject = new Subject<PresenceEvent>();
  private readonly userDisconnectedSubject = new Subject<PresenceEvent>();
  private readonly errorSubject = new Subject<BoardError>();
  private readonly refreshSubject = new Subject<void>();

  readonly statusChanged$ = this.statusChangedSubject.asObservable();
  readonly itemMoved$ = this.itemMovedSubject.asObservable();
  /** An owner or admin reordered cards of a column: reload it. */
  readonly itemsReordered$ = this.itemsReorderedSubject.asObservable();
  readonly commentAdded$ = this.commentAddedSubject.asObservable();
  readonly userTyping$ = this.userTypingSubject.asObservable();
  readonly userConnected$ = this.userConnectedSubject.asObservable();
  readonly userDisconnected$ = this.userDisconnectedSubject.asObservable();
  /** Messages of this client that the server refused (an illegal move, a work item of another project…). */
  readonly errors$ = this.errorSubject.asObservable();
  /** Reload from the API now: the connection is down (polling) or has just come back (catch up on what was missed). */
  readonly refresh$: Observable<void> = this.refreshSubject.asObservable();

  private transport: StompTransport | null = null;
  private board: { tenantId: string; projectCode: string } | null = null;
  private subscriptions = new Subscription();
  /** Set when events may have been missed, so the next successful connection asks for a reload. */
  private needsResync = false;
  private everConnected = false;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether a connection attempt has started: the state the transport starts in (closed) is not a failed attempt. */
  private attempting = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
    // Polling fallback: runs for as long as nothing is connected, and stops the moment something is.
    this.statusChanges
      .pipe(
        switchMap((status) => (status === 'connected' || !this.board ? EMPTY : interval(POLL_INTERVAL_MS))),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.refreshSubject.next());
  }

  /** Opens the board of a project of the signed-in user's tenant. Opening the board already open does nothing. */
  connect(projectCode: string): void {
    this.cancelRelease();
    const tenantId = this.tenantContext.tenantId();
    if (!tenantId) {
      return;
    }
    if (this.board?.tenantId === tenantId && this.board.projectCode === projectCode) {
      return;
    }
    this.disconnect();

    this.board = { tenantId, projectCode };
    this.needsResync = false;
    this.everConnected = false;
    this.attempting = false;
    this.setStatus('connecting');

    const transport = this.createTransport();
    this.transport = transport;
    transport.configure(this.configuration());
    this.subscriptions = new Subscription();
    this.subscriptions.add(transport.watch(this.topic()).subscribe((message) => this.onMessage(message)));
    this.subscriptions.add(transport.watch('/user/queue/errors').subscribe((message) => this.onMessage(message)));
    this.subscriptions.add(transport.connectionState$.subscribe((state) => this.onConnectionState(state)));
    transport.activate();
  }

  /**
   * A screen is done with the board. It closes shortly after unless a screen opens it again first (the next page of the
   * same project), so navigating does not tear the connection down and build it up again.
   */
  release(): void {
    this.cancelRelease();
    this.releaseTimer = setTimeout(() => {
      this.releaseTimer = null;
      this.disconnect();
    }, RELEASE_GRACE_MS);
  }

  /** Says goodbye and closes at once. Safe to call when nothing is open. */
  disconnect(): void {
    this.cancelRelease();
    const transport = this.transport;
    const board = this.board;
    if (!transport || !board) {
      return;
    }
    if (this.status() === 'connected') {
      this.send(transport, board, 'disconnect', {});
    }
    this.subscriptions.unsubscribe();
    this.transport = null;
    this.board = null;
    this.online.set([]);
    this.setStatus('offline');
    void transport.deactivate();
  }

  /** Changes a work item's status over the socket. `false` if there is no live connection: use the API instead. */
  changeStatus(workItemCode: string, status: string): boolean {
    return this.publish('status-changed', { workItemCode, status });
  }

  /** A card dropped in a column. `false` if there is no live connection: use the API instead. */
  moveItem(workItemCode: string, status: string, position?: number): boolean {
    return this.publish('item-moved', { workItemCode, status, position });
  }

  addComment(workItemCode: string, content: string): boolean {
    return this.publish('comment-added', { workItemCode, content });
  }

  /** The server passes it on at most every couple of seconds, so calling it on every keystroke is fine. */
  notifyTyping(workItemCode: string): boolean {
    return this.publish('user-typing', { workItemCode });
  }

  private publish(action: string, body: object): boolean {
    if (!this.transport || !this.board || this.status() !== 'connected') {
      return false;
    }
    this.send(this.transport, this.board, action, body);
    return true;
  }

  private send(transport: StompTransport, board: { tenantId: string; projectCode: string }, action: string, body: object): void {
    transport.publish({
      destination: `/app/tenant/${board.tenantId}/project/${board.projectCode}/${action}`,
      body: JSON.stringify(body),
      headers: JSON_HEADERS,
    });
  }

  private topic(): string {
    const board = this.board!;
    return `/topic/tenant/${board.tenantId}/project/${board.projectCode}`;
  }

  private configuration(): RxStompConfig {
    const board = this.board!;
    return {
      brokerURL: this.url(board),
      reconnectDelay: RECONNECT_DELAY_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      // Every attempt builds its URL again: a token that was renewed meanwhile is used, and an expired one stops the retries.
      beforeConnect: (client) => {
        if (!this.auth.isAuthenticated()) {
          void client.deactivate();
          this.setStatus('offline');
          return;
        }
        client.configure({ brokerURL: this.url(board) });
      },
    };
  }

  private url(board: { tenantId: string; projectCode: string }): string {
    const token = encodeURIComponent(this.auth.getToken() ?? '');
    return `${environment.wsUrl}/ws/tenant/${board.tenantId}/project/${board.projectCode}/board?token=${token}`;
  }

  private onConnectionState(state: RxStompState): void {
    if (!this.board) {
      return;
    }
    switch (state) {
      case RxStompState.OPEN:
        this.setStatus('connected');
        if (this.needsResync) {
          this.needsResync = false;
          this.refreshSubject.next();
        }
        this.everConnected = true;
        this.announce(1);
        break;
      case RxStompState.CONNECTING:
        this.attempting = true;
        if (this.everConnected) {
          this.setStatus('reconnecting');
        }
        break;
      case RxStompState.CLOSED:
        if (!this.attempting) {
          break;
        }
        this.needsResync = true;
        this.online.set([]);
        // Before the first connection there is nothing to reconnect to yet: report offline while attempts continue quietly
        this.setStatus(this.everConnected ? 'reconnecting' : 'offline');
        break;
      default:
        break;
    }
  }

  /**
   * Tells the board this user is here. Their subscription and this message travel separately and the server may handle
   * them in either order, so if the announcement is not echoed back (which is how the online list arrives), it is repeated.
   */
  private announce(attempt: number): void {
    const transport = this.transport;
    const board = this.board;
    if (!transport || !board || this.status() !== 'connected') {
      return;
    }
    this.send(transport, board, 'connect', {});
    if (attempt < MAX_ANNOUNCEMENTS) {
      const me = this.auth.getCurrentUser()?.id;
      this.subscriptions.add(
        timer(ANNOUNCE_RETRY_MS).subscribe(() => {
          if (this.transport === transport && !this.online().some((user) => user.userCode === me)) {
            this.announce(attempt + 1);
          }
        }),
      );
    }
  }

  private onMessage(message: IMessage): void {
    let parsed: BoardMessage;
    try {
      parsed = JSON.parse(message.body) as BoardMessage;
    } catch {
      return;
    }
    switch (parsed.type) {
      case 'ITEM_STATUS_CHANGED':
        this.statusChangedSubject.next(parsed.data);
        break;
      case 'ITEM_MOVED':
        this.itemMovedSubject.next(parsed.data);
        break;
      case 'ITEMS_REORDERED':
        this.itemsReorderedSubject.next(parsed.data);
        break;
      case 'COMMENT_ADDED':
        this.commentAddedSubject.next(parsed.data);
        break;
      case 'USER_TYPING':
        this.userTypingSubject.next(parsed.data);
        break;
      case 'USER_CONNECTED':
        this.online.set(parsed.data.usersOnline);
        this.userConnectedSubject.next(parsed.data);
        break;
      case 'USER_DISCONNECTED':
        this.online.set(parsed.data.usersOnline);
        this.userDisconnectedSubject.next(parsed.data);
        break;
      case 'ERROR':
        this.errorSubject.next(parsed.data);
        break;
    }
  }

  private cancelRelease(): void {
    if (this.releaseTimer !== null) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status.set(status);
    this.statusChanges.next(status);
  }
}
