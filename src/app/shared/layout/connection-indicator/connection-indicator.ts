import { Component, DestroyRef, computed, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { ConnectionStatus } from '../../../board/models/board.models';

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado en vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión en vivo: los datos se actualizan cada cierto tiempo',
};

/** The dot's colour: a token pair checked in `theme-contrast.spec.ts`. The words say the same thing, so colour is never the only cue. */
const DOT_CLASSES: Record<ConnectionStatus, string> = {
  connecting: 'bg-warning-800 dark:bg-warning-300',
  connected: 'bg-success-800 dark:bg-success-300',
  reconnecting: 'bg-warning-800 dark:bg-warning-300',
  offline: 'bg-error-800 dark:bg-error-300',
};

/**
 * Keeps the live connection to a project's board open for as long as it is on screen, and shows where it stands and who
 * else has the board open. Moved here in Phase 16 (was `board/components/board-connection`) so the shell's top bar can
 * show it for whichever project is current; it also re-asserts its `connect()` on every navigation, so it reclaims the
 * connection if another instance (a not-yet-migrated screen with its own project) took it over and then let go.
 */
@Component({
  selector: 'app-connection-indicator',
  templateUrl: './connection-indicator.html',
})
export class ConnectionIndicator {
  private readonly board = inject(BoardWebSocketService);

  readonly projectCode = input.required<string>();

  protected readonly status = this.board.connectionStatus;
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
  protected readonly dotClasses = computed(() => DOT_CLASSES[this.status()]);
  protected readonly usersOnline = computed(() =>
    this.board
      .usersOnline()
      .map((user) => user.email)
      .join(', '),
  );

  constructor() {
    effect(() => {
      const projectCode = this.projectCode();
      untracked(() => this.board.connect(projectCode));
    });
    inject(Router)
      .events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.board.connect(this.projectCode()));
    inject(DestroyRef).onDestroy(() => this.board.release());
  }
}
