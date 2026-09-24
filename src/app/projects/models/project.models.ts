export interface Project {
  projectCode: string;
  name: string;
  /** Short display key, for example `WAR`. */
  key: string;
  description?: string;
}

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';

export interface Sprint {
  sprintCode: string;
  projectCode: string;
  name: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
}
