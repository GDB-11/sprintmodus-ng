import { UserRef } from '../../work-items/models/work-item.models';

/** What a notification is about: a machine code, never text. The backend stores none, so the sentence is built here. */
export type InboxNotificationType = 'MENTIONED';

export interface InboxWorkItemRef {
  workItemCode: string;
  displayKey: string;
  title: string;
}

export interface InboxNotification {
  notificationCode: string;
  type: InboxNotificationType;
  workItem: InboxWorkItemRef;
  commentCode?: string;
  actor: UserRef;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface InboxPage {
  items: InboxNotification[];
  total: number;
  page: number;
  size: number;
}
