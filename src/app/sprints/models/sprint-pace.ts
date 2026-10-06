import { Burndown } from '../../projects/models/project.models';
import { lastActualPoint } from './burndown-projection';

export interface SprintPace {
  remainingHours: number;
  baselineHours: number;
  /** More hours left than the ideal line allows on the last recorded day. */
  behind: boolean;
}

/** Where an active sprint stands against its ideal line, or `null` while no day has been recorded. */
export function sprintPace(burndown: Burndown): SprintPace | null {
  const last = lastActualPoint(burndown);
  if (!last) {
    return null;
  }
  const remainingHours = last.remainingHours ?? 0;
  return { remainingHours, baselineHours: burndown.baselineHours, behind: remainingHours > last.idealRemainingHours };
}
