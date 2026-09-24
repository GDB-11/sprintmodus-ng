import { Component, inject } from '@angular/core';
import { NotificationService } from '../notification.service';

/** Shows the pending notifications in a live region, so assistive technology announces them as they arrive. */
@Component({
  selector: 'app-notification-outlet',
  host: { class: 'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4' },
  templateUrl: './notification-outlet.html',
})
export class NotificationOutlet {
  private readonly service = inject(NotificationService);

  protected readonly notifications = this.service.notifications;
  protected readonly labels = {
    success: 'Done',
    info: 'Note',
    warning: 'Warning',
    error: 'Error',
  } as const;

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
