import { Service, signal } from '@angular/core';

export type NotificationKind = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

/** Most messages kept on screen at once; the oldest is dropped first. */
const MAX_NOTIFICATIONS = 5;

/**
 * Messages for the user that outlive the component that raised them, such as the warning the backend attaches to a
 * change it accepted anyway. They stay until dismissed: nothing times out under a screen reader or a slow reader.
 */
@Service()
export class NotificationService {
  private nextId = 1;
  private readonly items = signal<readonly Notification[]>([]);

  readonly notifications = this.items.asReadonly();

  notify(kind: NotificationKind, message: string): void {
    const notification = { id: this.nextId++, kind, message };
    this.items.update((items) => [...items, notification].slice(-MAX_NOTIFICATIONS));
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
