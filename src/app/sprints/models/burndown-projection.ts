import { Burndown } from '../../projects/models/project.models';

/**
 * A rough answer to "will it be done?", from the pace so far. Not a forecast of the sprint's scope: work added later moves it.
 * - `no-data`: the sprint has not started, or no day has been recorded yet.
 * - `done`: nothing is left.
 * - `no-progress`: hours have not gone down, so no pace can be worked out.
 * - `projected`: at the pace of the days so far, the hours run out on `finishDay`.
 * - `closed`: the sprint is over; `remainingHours` is what it closed with.
 */
export type Projection =
  | { kind: 'no-data' }
  | { kind: 'done' }
  | { kind: 'no-progress'; remainingHours: number }
  | { kind: 'projected'; finishDay: number; finishDate: string; withinSprint: boolean; daysLate: number; hoursPerDay: number; remainingHours: number }
  | { kind: 'closed'; remainingHours: number };

/** `date` (a `YYYY-MM-DD`) moved by `days`, without a time zone involved. */
export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** The last day with a recorded value: the point the projection starts from. */
export function lastActualPoint(burndown: Burndown) {
  return [...burndown.points].reverse().find((point) => point.day >= 1 && point.remainingHours != null);
}

export function projectCompletion(burndown: Burndown): Projection {
  const last = lastActualPoint(burndown);
  if (burndown.status === 'PLANNED' || !last) {
    return { kind: 'no-data' };
  }
  const remaining = last.remainingHours ?? 0;
  if (burndown.status === 'CLOSED') {
    return { kind: 'closed', remainingHours: remaining };
  }
  if (remaining <= 0) {
    return { kind: 'done' };
  }
  const burned = burndown.baselineHours - remaining;
  if (burned <= 0) {
    return { kind: 'no-progress', remainingHours: remaining };
  }
  const hoursPerDay = burned / last.day;
  const finishDay = Math.ceil(last.day + remaining / hoursPerDay);
  return {
    kind: 'projected',
    finishDay,
    finishDate: addDays(burndown.startDate, finishDay - 1),
    withinSprint: finishDay <= burndown.days,
    daysLate: Math.max(0, finishDay - burndown.days),
    hoursPerDay,
    remainingHours: remaining,
  };
}
