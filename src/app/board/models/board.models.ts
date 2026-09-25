import { UserRef, WorkItemComment, WorkItemStatus } from '../../work-items/models/work-item.models';

/**
 * Where the live connection to a project's board stands. `connecting` is the first attempt; `reconnecting` is a live
 * connection that was lost and is being restored; `offline` is no connection (never established, closed on purpose, or the
 * session expired), and the board is kept fresh by polling instead.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

/** Someone with the board open. The email comes from their token: presence does not carry a display name. */
export interface OnlineUser {
  userCode: string;
  email: string;
}

/** A work item's status changed (from its detail page, the API, or a drop on the board). */
export interface StatusChangedEvent {
  workItemCode: string;
  displayKey: string;
  status: WorkItemStatus;
  /** Where the item can go from its new status, so a client never has to work the workflow out itself. */
  allowedStatuses: WorkItemStatus[];
  changedBy?: UserRef;
  updatedAt: string;
}

/** A card was dropped in another column. Same effect as a status change, plus where it landed. */
export interface ItemMovedEvent {
  workItemCode: string;
  displayKey: string;
  fromStatus: string;
  status: WorkItemStatus;
  allowedStatuses: WorkItemStatus[];
  /** The card's place in the column. Passed on to other clients only: the order within a column is not stored. */
  position?: number;
  movedBy?: UserRef;
  updatedAt: string;
}

/** Cards of a column were put in another order. The new order is not in the event: the column is reloaded. */
export interface ItemsReorderedEvent {
  workItemCode: string;
  displayKey: string;
  status: WorkItemStatus;
}

export interface CommentAddedEvent {
  workItemCode: string;
  comment: WorkItemComment;
}

export interface UserTypingEvent {
  workItemCode: string;
  user: OnlineUser;
}

export interface PresenceEvent {
  user: OnlineUser;
  usersOnline: OnlineUser[];
}

/** Why one of this client's own messages was not accepted. Sent to this client only. */
export interface BoardError {
  code: string;
  message: string;
  workItemCode?: string;
}

/** Everything the server broadcasts to a board, or tells one client, in one envelope. */
export type BoardMessage =
  | { type: 'ITEM_STATUS_CHANGED'; data: StatusChangedEvent }
  | { type: 'ITEM_MOVED'; data: ItemMovedEvent }
  | { type: 'ITEMS_REORDERED'; data: ItemsReorderedEvent }
  | { type: 'COMMENT_ADDED'; data: CommentAddedEvent }
  | { type: 'USER_TYPING'; data: UserTypingEvent }
  | { type: 'USER_CONNECTED'; data: PresenceEvent }
  | { type: 'USER_DISCONNECTED'; data: PresenceEvent }
  | { type: 'ERROR'; data: BoardError };
