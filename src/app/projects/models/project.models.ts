export interface Project {
  projectCode: string;
  name: string;
  /** Short display key, for example `WAR`. */
  key: string;
  description?: string;
}

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  PLANNED: 'Planificado',
  ACTIVE: 'Activo',
  CLOSED: 'Cerrado',
};

export interface Sprint {
  sprintCode: string;
  projectCode: string;
  name: string;
  status: SprintStatus;
  /** Length in days, fixed when the sprint was created from the tenant's configuration. */
  configuredDays: number;
  /** First day (a calendar date, `YYYY-MM-DD`). */
  startDate: string;
  /** The day it ends: the range is half-open, so the next sprint may start on this date. */
  endDate: string;
  /** Effort points planned for it. */
  plannedVelocity: number;
  /** Effort points completed; frozen once the sprint is closed. */
  velocity: number;
}

export interface CreateSprintRequest {
  projectCode: string;
  name: string;
  /** Left out: the next configured start day. */
  startDate?: string;
  plannedVelocity?: number;
}

export const WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

/** How the organization's sprints are planned. Changing it affects the sprints created afterwards. */
export interface SprintConfig {
  defaultSprintDays: number;
  sprintStartDay: WeekDay;
  velocityTrackingEnabled: boolean;
}

/** One day of a burndown. Day 0 is the eve of the sprint's first day; days 1..N are the sprint's own. */
export interface BurndownPoint {
  day: number;
  date: string;
  /** Where the straight line from the starting scope to nothing is on this day. */
  idealRemainingHours: number;
  /** Hours still to do at the end of the day; absent for a day that has not happened (or came after the sprint closed). */
  remainingHours?: number | null;
}

export interface Burndown {
  sprintCode: string;
  sprintName: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  days: number;
  /** The hours in the sprint when it began: where the ideal line starts. */
  baselineHours: number;
  points: BurndownPoint[];
}

export interface VelocityHistory {
  projectCode: string;
  /** The last closed sprints, oldest first. */
  sprints: Sprint[];
  averageVelocity: number;
}
