import { Component, DestroyRef, computed, effect, inject, input, untracked } from '@angular/core';
import { ConnectionStatus } from '../../models/board.models';
import { BoardWebSocketService } from '../../services/board-websocket.service';

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
 * else has the board open. Any screen that reacts to live changes places one of these; the connection itself is shared.
 */
@Component({
  selector: 'app-board-connection',
  templateUrl: './board-connection.html',
})
export class BoardConnection {
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
    inject(DestroyRef).onDestroy(() => this.board.release());
  }
}
