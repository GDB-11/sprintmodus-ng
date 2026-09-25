import { burndown } from '../../projects/projects.testing';
import { addDays, lastActualPoint, projectCompletion } from './burndown-projection';

describe('burndown projection', () => {
  it('moves a date by days without a time zone getting in the way', () => {
    expect(addDays('2026-01-05', 0)).toBe('2026-01-05');
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('finds the last day that has a value', () => {
    expect(lastActualPoint(burndown(5, 40, [36, 30, null, null, null]))?.day).toBe(2);
    expect(lastActualPoint(burndown(5, 40, []))).toBeUndefined();
  });

  it('has nothing to say before the sprint started or before a day was recorded', () => {
    expect(projectCompletion(burndown(5, 40, [], { status: 'PLANNED' }))).toEqual({ kind: 'no-data' });
    expect(projectCompletion(burndown(5, 40, []))).toEqual({ kind: 'no-data' });
  });

  it('projects the day the hours run out from the pace so far', () => {
    // 10 h burned in 2 days: 5 h/day; 30 h left take 6 more days: day 8, in a 10-day sprint
    const projection = projectCompletion(burndown(10, 40, [36, 30]));

    expect(projection).toEqual({
      kind: 'projected',
      finishDay: 8,
      finishDate: '2026-01-12',
      withinSprint: true,
      daysLate: 0,
      hoursPerDay: 5,
      remainingHours: 30,
    });
  });

  it('says how many days late a slow sprint will be, rounding up', () => {
    // 4 h burned in 2 days: 2 h/day; 36 h left take 18 more days: day 20 in a 10-day sprint
    const projection = projectCompletion(burndown(10, 40, [39, 36]));

    expect(projection).toMatchObject({ kind: 'projected', finishDay: 20, withinSprint: false, daysLate: 10 });
  });

  it('is done when nothing is left, and cannot project a sprint that has not burned anything', () => {
    expect(projectCompletion(burndown(5, 40, [20, 0]))).toEqual({ kind: 'done' });
    expect(projectCompletion(burndown(5, 40, [40, 40]))).toEqual({ kind: 'no-progress', remainingHours: 40 });
    expect(projectCompletion(burndown(5, 40, [45, 50]))).toEqual({ kind: 'no-progress', remainingHours: 50 });
  });

  it('does not project a closed sprint: it says what was left', () => {
    expect(projectCompletion(burndown(5, 40, [30, 12], { status: 'CLOSED' }))).toEqual({ kind: 'closed', remainingHours: 12 });
  });
});
