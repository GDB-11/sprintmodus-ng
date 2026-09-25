import { Component, computed, input, model } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SPRINT_STATUS_LABELS, Sprint } from '../../../projects/models/project.models';

/** `all`, `backlog` (items in no sprint) or a sprint code. */
export type SprintSelection = string;
export const ALL_SPRINTS = 'all';
export const BACKLOG = 'backlog';

/** How many ended and upcoming sprints get a button of their own; the rest are in the "Otros sprints" list. */
const NEAR_SPRINTS = 2;


const BUTTON_CLASSES =
  'rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:focus-visible:outline-secondary-400';
const PRESSED_CLASSES = 'bg-primary-500 font-semibold text-neutral-900 hover:bg-primary-400';
const IDLE_CLASSES = 'border border-neutral-700 dark:border-neutral-400';

/**
 * Which sprint a board shows. The sprints people reach for are one click away: the ones that ended most recently, the
 * current one and the next ones, then the backlog and everything at once; older or later sprints are in a list. The
 * current selection is pressed (`aria-pressed`), and every sprint says its state in words, never only in colour.
 */
@Component({
  selector: 'app-sprint-filter',
  imports: [DatePipe],
  templateUrl: './sprint-filter.html',
})
export class SprintFilter {
  readonly sprints = input.required<readonly Sprint[]>();
  readonly selected = model.required<SprintSelection>();

  protected readonly statusLabels = SPRINT_STATUS_LABELS;
  protected readonly allSprints = ALL_SPRINTS;
  protected readonly backlog = BACKLOG;

  /** Ended most recently, oldest of those first, so the row reads as a timeline: past · current · next. */
  protected readonly recent = computed(() =>
    this.sprints()
      .filter((sprint) => sprint.status === 'CLOSED')
      .sort((a, b) => b.endDate.localeCompare(a.endDate))
      .slice(0, NEAR_SPRINTS)
      .reverse(),
  );
  protected readonly current = computed(() => this.sprints().filter((sprint) => sprint.status === 'ACTIVE'));
  protected readonly upcoming = computed(() =>
    this.sprints()
      .filter((sprint) => sprint.status === 'PLANNED')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, NEAR_SPRINTS),
  );
  /** The groups of buttons that have any sprint, in timeline order. */
  protected readonly groups = computed(() =>
    [
      { id: 'recent', label: 'Terminaron hace poco', sprints: this.recent() },
      { id: 'current', label: 'Sprint actual', sprints: this.current() },
      { id: 'upcoming', label: 'Próximos', sprints: this.upcoming() },
    ].filter((group) => group.sprints.length > 0),
  );
  protected readonly others = computed(() => {
    const shown = new Set([...this.recent(), ...this.current(), ...this.upcoming()].map((sprint) => sprint.sprintCode));
    return this.sprints()
      .filter((sprint) => !shown.has(sprint.sprintCode))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  });
  protected readonly otherSelected = computed(() => this.others().some((sprint) => sprint.sprintCode === this.selected()));

  protected classes(selection: SprintSelection): string {
    return `${BUTTON_CLASSES} ${this.selected() === selection ? PRESSED_CLASSES : IDLE_CLASSES}`;
  }

  protected chooseOther(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.selected.set(value);
    }
  }
}
