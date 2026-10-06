import { Burndown } from '../../projects/models/project.models';
import { sprintPace } from './sprint-pace';

const burndown = (points: Burndown['points']): Burndown => ({
  sprintCode: 's',
  sprintName: 'Sprint 1',
  status: 'ACTIVE',
  startDate: '2026-10-01',
  endDate: '2026-10-15',
  days: 14,
  baselineHours: 40,
  points,
});

describe('sprintPace', () => {
  it('is null before any day has been recorded', () => {
    expect(sprintPace(burndown([{ day: 0, date: '2026-09-30', idealRemainingHours: 40, remainingHours: 40 }]))).toBeNull();
  });

  it('is behind when more hours are left than the ideal line allows', () => {
    const pace = sprintPace(
      burndown([
        { day: 0, date: '2026-09-30', idealRemainingHours: 40, remainingHours: 40 },
        { day: 1, date: '2026-10-01', idealRemainingHours: 30, remainingHours: 35 },
      ]),
    );
    expect(pace).toEqual({ remainingHours: 35, baselineHours: 40, behind: true });
  });

  it('is on track at or under the ideal line', () => {
    const pace = sprintPace(burndown([{ day: 1, date: '2026-10-01', idealRemainingHours: 30, remainingHours: 30 }]));
    expect(pace?.behind).toBe(false);
  });
});
