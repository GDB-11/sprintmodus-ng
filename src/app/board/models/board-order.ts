import { Priority, WorkItemSummary } from '../../work-items/models/work-item.models';

/** Critical first. The same order the backend sorts a board column in. */
export const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const UNRANKED = Number.MAX_SAFE_INTEGER;

/** The order of a board column: by priority, then by the manual rank (unranked last), then by number. */
export function compareForBoard(a: WorkItemSummary, b: WorkItemSummary): number {
  return (
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    (a.boardRank ?? UNRANKED) - (b.boardRank ?? UNRANKED) ||
    a.workItemNumber - b.workItemNumber
  );
}

/** The cards that share a manual rank with `card`: same type, status and priority, in board order. */
export function rankGroupOf(cards: readonly WorkItemSummary[], card: WorkItemSummary): WorkItemSummary[] {
  return cards
    .filter((other) => other.type === card.type && other.status.code === card.status.code && other.priority === card.priority)
    .sort(compareForBoard);
}

/** `group` with `moved` put right before `before`, or last when `before` is `null`. The rule the backend applies. */
export function placeBefore(group: readonly string[], moved: string, before: string | null): string[] {
  const others = group.filter((code) => code !== moved);
  const at = before === null ? others.length : others.indexOf(before);
  return [...others.slice(0, at < 0 ? others.length : at), moved, ...others.slice(at < 0 ? others.length : at)];
}
