import { Burndown, BurndownPoint, Sprint } from './models/project.models';

export function sprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    sprintCode: 's1',
    projectCode: 'p1',
    name: 'Sprint 1',
    status: 'PLANNED',
    configuredDays: 14,
    startDate: '2026-01-05',
    endDate: '2026-01-19',
    plannedVelocity: 0,
    velocity: 0,
    ...overrides,
  };
}

/** A burndown of `days` days from `baseline` hours, with the given remaining hours for days 1, 2, … (later days have not happened). */
export function burndown(days: number, baseline: number, remaining: (number | null)[], overrides: Partial<Burndown> = {}): Burndown {
  const points: BurndownPoint[] = [];
  for (let day = 0; day <= days; day++) {
    points.push({
      day,
      date: `2026-01-${String(4 + day).padStart(2, '0')}`,
      idealRemainingHours: Math.round(((baseline * (days - day)) / days) * 100) / 100,
      remainingHours: day === 0 ? baseline : (remaining[day - 1] ?? null),
    });
  }
  return {
    sprintCode: 's1',
    sprintName: 'Sprint 1',
    status: 'ACTIVE',
    startDate: '2026-01-05',
    endDate: `2026-01-${String(5 + days).padStart(2, '0')}`,
    days,
    baselineHours: baseline,
    points,
    ...overrides,
  };
}
