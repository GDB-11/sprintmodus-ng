import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import { IRxStompPublishParams } from '@stomp/rx-stomp';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { fakeJwt, stubLocalStorage } from '../../auth/utils/testing';
import {
  ANNOUNCE_RETRY_MS,
  BoardWebSocketService,
  POLL_INTERVAL_MS,
  RECONNECT_DELAY_MS,
  RELEASE_GRACE_MS,
  STOMP_TRANSPORT_FACTORY,
  StompTransport,
} from './board-websocket.service';

const TOPIC = '/topic/tenant/t-1/project/p-1';
const APP = '/app/tenant/t-1/project/p-1';

/** A STOMP client that goes nowhere: the test plays the server. */
class FakeTransport {
  readonly connectionState$ = new BehaviorSubject<RxStompState>(RxStompState.CLOSED);
  readonly configured: RxStompConfig[] = [];
  readonly published: IRxStompPublishParams[] = [];
  readonly watched: string[] = [];
  activated = 0;
  deactivated = 0;
  private readonly topics = new Map<string, Subject<{ body: string }>>();

  configure(config: RxStompConfig): void {
    this.configured.push(config);
  }
  activate(): void {
    this.activated++;
  }
  async deactivate(): Promise<void> {
    this.deactivated++;
  }
  publish(params: IRxStompPublishParams): void {
    this.published.push(params);
  }
  watch(destination: string) {
    this.watched.push(destination);
    return this.subject(destination).asObservable();
  }

  /** Delivers a broadcast (or a private error) as the server would. */
  deliver(destination: string, message: object): void {
    this.subject(destination).next({ body: JSON.stringify(message) });
  }
  state(state: RxStompState): void {
    this.connectionState$.next(state);
  }
  sent(action: string): IRxStompPublishParams[] {
    return this.published.filter((params) => params.destination === `${APP}/${action}`);
  }

  private subject(destination: string): Subject<{ body: string }> {
    if (!this.topics.has(destination)) {
      this.topics.set(destination, new Subject());
    }
    return this.topics.get(destination)!;
  }
}

const ANA = { userCode: 'u-1', email: 'ana@acme.io' };
const LUIS = { userCode: 'u-2', email: 'luis@acme.io' };

const STATUS = { code: 'IN_PROGRESS', displayName: 'En progreso', isInitial: false, isTerminal: false };

describe('BoardWebSocketService', () => {
  let transport: FakeTransport;
  /** The transport the next `connect()` gets. */
  let next: FakeTransport;

  beforeEach(() => {
    vi.useFakeTimers();
    stubLocalStorage();
    localStorage.setItem('sprintmodus.token', fakeJwt({ exp: Date.now() / 1000 + 3600 }));
    localStorage.setItem(
      'sprintmodus.session',
      JSON.stringify({
        user: { id: 'u-1', email: 'ana@acme.io', fullName: 'Ana', role: 'OWNER' },
        organization: { id: 't-1', code: 'acme', name: 'Acme' },
        subscription: { plan: 'PRO', maxProjects: 10, maxUsers: 25, maxStorageMB: 5000 },
      }),
    );
    transport = next = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: STOMP_TRANSPORT_FACTORY, useValue: () => next as unknown as StompTransport },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function open(): BoardWebSocketService {
    const service = TestBed.inject(BoardWebSocketService);
    service.connect('p-1');
    return service;
  }

  /** The server has accepted the connection and the user has arrived. */
  function connected(service: BoardWebSocketService, online = [ANA]): void {
    transport.state(RxStompState.CONNECTING);
    transport.state(RxStompState.OPEN);
    transport.deliver(TOPIC, { type: 'USER_CONNECTED', data: { user: ANA, usersOnline: online } });
    expect(service.connectionStatus()).toBe('connected');
  }

  describe('connecting', () => {
    it('opens the board of the signed-in tenant with the token in the URL and retries on its own', () => {
      const service = open();

      const config = transport.configured[0];
      expect(config.brokerURL).toBe(
        `${environment.wsUrl}/ws/tenant/t-1/project/p-1/board?token=${encodeURIComponent(localStorage.getItem('sprintmodus.token')!)}`,
      );
      expect(config.reconnectDelay).toBe(RECONNECT_DELAY_MS);
      expect(transport.watched).toEqual([TOPIC, '/user/queue/errors']);
      expect(transport.activated).toBe(1);
      expect(service.connectionStatus()).toBe('connecting');
    });

    it('does nothing when signed out', () => {
      localStorage.clear();
      const service = TestBed.inject(BoardWebSocketService);

      service.connect('p-1');

      expect(transport.activated).toBe(0);
      expect(service.connectionStatus()).toBe('offline');
    });

    it('opening the board that is already open changes nothing', () => {
      const service = open();

      service.connect('p-1');

      expect(transport.activated).toBe(1);
    });

    it('builds the URL again on every attempt, and stops trying once the session has expired', () => {
      open();
      const config = transport.configured[0];
      const client = { configure: vi.fn(), deactivate: vi.fn().mockResolvedValue(undefined) };

      config.beforeConnect!(client as never);
      expect(client.configure).toHaveBeenCalledWith({ brokerURL: config.brokerURL });

      vi.setSystemTime(Date.now() + 2 * 3600 * 1000); // the token was good for an hour
      config.beforeConnect!(client as never);
      expect(client.deactivate).toHaveBeenCalled();
      expect(TestBed.inject(BoardWebSocketService).connectionStatus()).toBe('offline');
    });

    it('announces itself once connected, as JSON', () => {
      open();

      transport.state(RxStompState.CONNECTING);
      transport.state(RxStompState.OPEN);

      expect(transport.sent('connect')).toHaveLength(1);
      expect(transport.sent('connect')[0].headers).toEqual({ 'content-type': 'application/json' });
    });

    it('announces again when its arrival is not echoed back, and stops once it is', () => {
      const service = open();
      transport.state(RxStompState.CONNECTING);
      transport.state(RxStompState.OPEN);

      vi.advanceTimersByTime(ANNOUNCE_RETRY_MS);
      expect(transport.sent('connect')).toHaveLength(2);

      transport.deliver(TOPIC, { type: 'USER_CONNECTED', data: { user: ANA, usersOnline: [ANA] } });
      vi.advanceTimersByTime(ANNOUNCE_RETRY_MS * 3);

      expect(transport.sent('connect')).toHaveLength(2);
      expect(service.usersOnline()).toEqual([ANA]);
    });

    it('gives up announcing after three tries', () => {
      open();
      transport.state(RxStompState.CONNECTING);
      transport.state(RxStompState.OPEN);

      vi.advanceTimersByTime(ANNOUNCE_RETRY_MS * 10);

      expect(transport.sent('connect')).toHaveLength(3);
    });
  });

  describe('events', () => {
    it('hands each kind of event to its own stream', () => {
      const service = open();
      connected(service);
      const seen: Record<string, unknown> = {};
      service.statusChanged$.subscribe((event) => (seen['status'] = event));
      service.itemMoved$.subscribe((event) => (seen['moved'] = event));
      service.itemsReordered$.subscribe((event) => (seen['reordered'] = event));
      service.commentAdded$.subscribe((event) => (seen['comment'] = event));
      service.userTyping$.subscribe((event) => (seen['typing'] = event));

      const changed = { workItemCode: 'i-1', displayKey: 'WAR-1', status: STATUS, allowedStatuses: [], updatedAt: 'now' };
      const moved = { ...changed, fromStatus: 'NEW', position: 2 };
      const comment = { workItemCode: 'i-1', comment: { commentCode: 'c-1', workItemCode: 'i-1', content: 'Hola', createdAt: 'now' } };
      const typing = { workItemCode: 'i-1', user: LUIS };
      transport.deliver(TOPIC, { type: 'ITEM_STATUS_CHANGED', data: changed });
      transport.deliver(TOPIC, { type: 'ITEM_MOVED', data: moved });
      const reordered = { workItemCode: 'i-1', displayKey: 'WAR-1', status: STATUS };
      transport.deliver(TOPIC, { type: 'ITEMS_REORDERED', data: reordered });
      transport.deliver(TOPIC, { type: 'COMMENT_ADDED', data: comment });
      transport.deliver(TOPIC, { type: 'USER_TYPING', data: typing });

      expect(seen).toEqual({ status: changed, moved, reordered, comment, typing });
    });

    it('keeps who is online up to date from arrivals and departures', () => {
      const service = open();
      connected(service);
      const arrivals: unknown[] = [];
      const departures: unknown[] = [];
      service.userConnected$.subscribe((event) => arrivals.push(event.user));
      service.userDisconnected$.subscribe((event) => departures.push(event.user));

      transport.deliver(TOPIC, { type: 'USER_CONNECTED', data: { user: LUIS, usersOnline: [ANA, LUIS] } });
      expect(service.usersOnline()).toEqual([ANA, LUIS]);

      transport.deliver(TOPIC, { type: 'USER_DISCONNECTED', data: { user: LUIS, usersOnline: [ANA] } });
      expect(service.usersOnline()).toEqual([ANA]);
      expect(arrivals).toEqual([LUIS]);
      expect(departures).toEqual([LUIS]);
    });

    it('reports what the server refused, to this client only', () => {
      const service = open();
      connected(service);
      const errors: unknown[] = [];
      service.errors$.subscribe((error) => errors.push(error));

      const refusal = { code: 'INVALID_TRANSITION', message: 'No se puede', workItemCode: 'i-1' };
      transport.deliver('/user/queue/errors', { type: 'ERROR', data: refusal });

      expect(errors).toEqual([refusal]);
    });

    it('ignores frames that are not JSON', () => {
      const service = open();
      connected(service);
      const seen: unknown[] = [];
      service.statusChanged$.subscribe((event) => seen.push(event));

      expect(() => transport.deliver(TOPIC, 'nope' as never)).not.toThrow();
      expect(seen).toEqual([]);
    });
  });

  describe('sending', () => {
    it('sends changes to the board it is connected to', () => {
      const service = open();
      connected(service);

      expect(service.changeStatus('i-1', 'IN_PROGRESS')).toBe(true);
      expect(service.moveItem('i-1', 'DONE', 3)).toBe(true);
      expect(service.addComment('i-1', 'Hola')).toBe(true);
      expect(service.notifyTyping('i-1')).toBe(true);

      const body = (action: string) => JSON.parse(transport.sent(action)[0].body as string);
      expect(body('status-changed')).toEqual({ workItemCode: 'i-1', status: 'IN_PROGRESS' });
      expect(body('item-moved')).toEqual({ workItemCode: 'i-1', status: 'DONE', position: 3 });
      expect(body('comment-added')).toEqual({ workItemCode: 'i-1', content: 'Hola' });
      expect(body('user-typing')).toEqual({ workItemCode: 'i-1' });
    });

    it('says it did not send anything when there is no live connection, so the caller can use the API', () => {
      const service = open();

      expect(service.changeStatus('i-1', 'DONE')).toBe(false);
      expect(service.addComment('i-1', 'Hola')).toBe(false);
      expect(transport.sent('status-changed')).toEqual([]);
    });
  });

  describe('when the connection is lost', () => {
    it('shows reconnecting, and asks for a reload once it is back to catch up on what was missed', () => {
      const service = open();
      connected(service);
      let reloads = 0;
      service.refresh$.subscribe(() => reloads++);

      transport.state(RxStompState.CLOSED);
      expect(service.connectionStatus()).toBe('reconnecting');
      expect(service.usersOnline()).toEqual([]);
      transport.state(RxStompState.CONNECTING);
      expect(service.connectionStatus()).toBe('reconnecting');
      expect(reloads).toBe(0);

      transport.state(RxStompState.OPEN);

      expect(service.connectionStatus()).toBe('connected');
      expect(reloads).toBe(1);
      expect(transport.sent('connect').length).toBeGreaterThan(1);
    });

    it('asks for a reload every so often while it is down, and stops when it is back', () => {
      const service = open();
      connected(service);
      let reloads = 0;
      service.refresh$.subscribe(() => reloads++);
      transport.state(RxStompState.CLOSED);

      vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
      expect(reloads).toBe(2);

      transport.state(RxStompState.OPEN);
      expect(reloads).toBe(3); // the catch-up reload
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 3);
      expect(reloads).toBe(3);
    });

    it('is offline, and polls, when the first connection never succeeds', () => {
      const service = open();
      let reloads = 0;
      service.refresh$.subscribe(() => reloads++);

      transport.state(RxStompState.CONNECTING);
      transport.state(RxStompState.CLOSED);
      expect(service.connectionStatus()).toBe('offline');
      transport.state(RxStompState.CONNECTING);
      expect(service.connectionStatus()).toBe('offline');
      vi.advanceTimersByTime(POLL_INTERVAL_MS);

      expect(reloads).toBe(1);
    });

    it('does not mistake the transport starting out closed for a failed attempt', () => {
      const service = open();

      expect(service.connectionStatus()).toBe('connecting');
    });
  });

  describe('disconnecting', () => {
    it('says goodbye, closes and clears who is online', () => {
      const service = open();
      connected(service);

      service.disconnect();

      expect(transport.sent('disconnect')).toHaveLength(1);
      expect(transport.deactivated).toBe(1);
      expect(service.connectionStatus()).toBe('offline');
      expect(service.usersOnline()).toEqual([]);
    });

    it('does not poll once closed on purpose', () => {
      const service = open();
      connected(service);
      let reloads = 0;
      service.refresh$.subscribe(() => reloads++);

      service.disconnect();
      vi.advanceTimersByTime(POLL_INTERVAL_MS * 3);

      expect(reloads).toBe(0);
    });

    it('is harmless when nothing is open', () => {
      const service = TestBed.inject(BoardWebSocketService);

      expect(() => service.disconnect()).not.toThrow();
    });

    it('stays open a moment after the last screen leaves, so moving between screens keeps the connection', () => {
      const service = open();
      connected(service);

      service.release();
      vi.advanceTimersByTime(RELEASE_GRACE_MS - 1);
      service.connect('p-1'); // the next screen of the same project
      vi.advanceTimersByTime(RELEASE_GRACE_MS * 2);

      expect(transport.deactivated).toBe(0);
      expect(service.connectionStatus()).toBe('connected');
    });

    it('closes once nobody has come back for it', () => {
      const service = open();
      connected(service);

      service.release();
      vi.advanceTimersByTime(RELEASE_GRACE_MS);

      expect(transport.deactivated).toBe(1);
      expect(service.connectionStatus()).toBe('offline');
    });

    it('closes the old board before opening another project', () => {
      const service = open();
      connected(service);
      const second = (next = new FakeTransport());

      service.connect('p-2');

      expect(transport.deactivated).toBe(1);
      expect(transport.sent('disconnect')).toHaveLength(1);
      expect(second.activated).toBe(1);
      expect(second.configured[0].brokerURL).toContain('/project/p-2/board');
    });
  });
});
