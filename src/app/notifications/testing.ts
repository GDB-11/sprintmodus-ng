import { InboxNotification } from './models/notification.models';

export function inboxNotification(overrides: Partial<InboxNotification> = {}): InboxNotification {
  return {
    notificationCode: 'n-1',
    type: 'MENTIONED',
    workItem: { workItemCode: 'item-1', displayKey: 'WAR-1000', title: 'Pay by card' },
    commentCode: 'c-1',
    actor: { userCode: 'u-olivia', fullName: 'Olivia Owner' },
    isRead: false,
    createdAt: '2026-09-26T10:00:00Z',
    ...overrides,
  };
}
