import { Service, signal } from '@angular/core';

export type NotificationKind = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

/** Most messages kept on screen at once; the oldest is dropped first. */
const MAX_NOTIFICATIONS = 5;

/** How long a message stays before it goes away on its own; errors and warnings stay longer to be read. */
const DISPLAY_MS: Record<NotificationKind, number> = {
  success: 5000,
  info: 5000,
  warning: 10000,
  error: 10000,
};

/**
 * Messages for the user that outlive the component that raised them, such as the warning the backend attaches to a
 * change it accepted anyway. Each one dismisses itself after `DISPLAY_MS` (or sooner by hand); the history of what
 * happened lives in the inbox and the work item's timeline, not here.
 */
@Service()
export class NotificationService {
  private nextId = 1;
  private readonly items = signal<readonly Notification[]>([]);

  readonly notifications = this.items.asReadonly();

  notify(kind: NotificationKind, message: string): void {
    const notification = { id: this.nextId++, kind, message };
    this.items.update((items) => [...items, notification].slice(-MAX_NOTIFICATIONS));
    setTimeout(() => this.dismiss(notification.id), DISPLAY_MS[kind]);
  }

  success(message: string): void {
    this.notify('success', message);
  }

  info(message: string): void {
    this.notify('info', message);
  }

  warning(message: string): void {
    this.notify('warning', message);
  }

  error(message: string): void {
    this.notify('error', message);
  }

  dismiss(id: number): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}
