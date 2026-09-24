export const ITEM_TYPES = ['EPIC', 'FEATURE', 'PBI', 'BUG', 'TASK'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  EPIC: 'Epic',
  FEATURE: 'Feature',
  PBI: 'Product backlog item',
  BUG: 'Bug',
  TASK: 'Task',
};

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export type AssignmentRole = 'DEV' | 'QA' | 'PO' | 'PM' | 'SCRUM_MASTER';

/**
 * A status as the item type's workflow defines it. The backend says what a status *is* (where items start, where they
 * are done), never how it looks: colours and icons are chosen here, per theme, so contrast is ours to guarantee.
 */
export interface WorkItemStatus {
  code: string;
  displayName: string;
  /** Where new items of the type start. */
  isInitial: boolean;
  /** Items in it count as completed. */
  isTerminal: boolean;
}

export interface UserRef {
  userCode: string;
  fullName: string;
}

export interface Warning {
  code: 'NON_STANDARD_HIERARCHY' | 'VELOCITY_NOT_UPDATED' | (string & {});
  message: string;
}

export interface WorkItemSummary {
  workItemCode: string;
  workItemNumber: number;
  /** For example `WAR-1000`. */
  displayKey: string;
  projectCode: string;
  type: ItemType;
  title: string;
  priority: Priority;
  status: WorkItemStatus;
  sprintCode?: string;
  parentCode?: string;
  effortPoints: number;
  createdBy?: UserRef;
  updatedAt: string;
}

export interface WorkItemPage {
  items: WorkItemSummary[];
  total: number;
  page: number;
  size: number;
}

export interface Assignee {
  assignmentCode: string;
  userCode: string;
  fullName: string;
  role: AssignmentRole;
}

export interface ChildItem {
  workItemCode: string;
  workItemNumber: number;
  displayKey: string;
  type: ItemType;
  title: string;
  status: WorkItemStatus;
}

export interface WorkItem {
  workItemCode: string;
  workItemNumber: number;
  displayKey: string;
  projectCode: string;
  projectKey: string;
  type: ItemType;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  priority: Priority;
  status: WorkItemStatus;
  sprintCode?: string;
  parentCode?: string;
  effortPoints: number;
  estimatedHours?: number;
  remainingHours?: number;
  createdBy?: UserRef;
  updatedBy?: UserRef;
  createdAt: string;
  updatedAt: string;
  assignees: Assignee[];
  children: ChildItem[];
  /** Where the item can move from its current status: the legal transitions only. */
  allowedStatuses: WorkItemStatus[];
  /** Notes about the change that was just made; empty when the item is only being read. */
  warnings: Warning[];
}

export interface WorkItemQuery {
  projectCode?: string;
  sprintCode?: string;
  /** Only items in no sprint. Ignored when `sprintCode` is set. */
  backlog?: boolean;
  type?: ItemType;
  status?: string;
  parentCode?: string;
  assignee?: string;
  priority?: Priority;
  page?: number;
  size?: number;
}

export interface CreateWorkItemRequest {
  projectCode: string;
  type: ItemType;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: Priority;
  parentCode?: string;
  effortPoints?: number;
  estimatedHours?: number;
  remainingHours?: number;
}

/** Fields left out keep their value; a blank description or acceptance criteria clears it. */
export interface UpdateWorkItemRequest {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: Priority;
  effortPoints?: number;
  estimatedHours?: number;
  remainingHours?: number;
}

export interface WorkItemComment {
  commentCode: string;
  workItemCode: string;
  author?: UserRef;
  content: string;
  createdAt: string;
}
