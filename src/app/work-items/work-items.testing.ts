import { WorkItem, WorkItemStatus, WorkItemSummary } from './models/work-item.models';

export const NEW_STATUS: WorkItemStatus = {
  code: 'NEW',
  displayName: 'New',
  isInitial: true,
  isTerminal: false,
};
export const APPROVED_STATUS: WorkItemStatus = {
  code: 'APPROVED',
  displayName: 'Approved',
  isInitial: false,
  isTerminal: false,
};
export const DONE_STATUS: WorkItemStatus = {
  code: 'DONE',
  displayName: 'Done',
  isInitial: false,
  isTerminal: true,
};

export function workItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    workItemCode: 'item-1',
    workItemNumber: 1000,
    displayKey: 'WAR-1000',
    projectCode: 'project-1',
    projectKey: 'WAR',
    type: 'PBI',
    title: 'Pay by card',
    priority: 'MEDIUM',
    status: NEW_STATUS,
    effortPoints: 5,
    createdBy: { userCode: 'user-1', fullName: 'Olivia Owner' },
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-01-05T10:00:00Z',
    assignees: [],
    children: [],
    allowedStatuses: [APPROVED_STATUS],
    warnings: [],
    ...overrides,
  };
}

export function summary(overrides: Partial<WorkItemSummary> = {}): WorkItemSummary {
  return {
    workItemCode: 'item-1',
    workItemNumber: 1000,
    displayKey: 'WAR-1000',
    projectCode: 'project-1',
    type: 'PBI',
    title: 'Pay by card',
    priority: 'MEDIUM',
    status: NEW_STATUS,
    effortPoints: 5,
    updatedAt: '2026-01-05T10:00:00Z',
    ...overrides,
  };
}
