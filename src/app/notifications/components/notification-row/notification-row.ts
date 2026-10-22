import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/button/button';
import { ListButton } from '../../../shared/ui/list-button/list-button';
import { Chip } from '../../../shared/ui/chip/chip';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { describeNotification } from '../../models/notification-description';
import { InboxNotification } from '../../models/notification.models';

/**
 * One notification, for `/notifications` and the top bar popover. Unread says so in words ("Sin leer" chip) and in weight,
 * never by colour alone. Full: a link to the work item (opening it is the caller's `opened`) plus "Marcar como leída".
 * Compact: one button that selects it (`opened`), for the popover's narrow list.
 */
@Component({
  selector: 'app-notification-row',
  imports: [DatePipe, RouterLink, Button, Chip, ListButton, TextLink],
  templateUrl: './notification-row.html',
})
export class NotificationRow {
  readonly notification = input.required<InboxNotification>();
  readonly compact = input(false);
  readonly working = input(false);
  readonly opened = output<void>();
  readonly markRead = output<void>();

  protected readonly description = computed(() => describeNotification(this.notification()));
  protected readonly weight = computed(() => (this.notification().isRead ? 'font-medium' : 'font-semibold'));
}
