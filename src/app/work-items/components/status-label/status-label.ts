import { Component, computed, input } from '@angular/core';
import { WorkItemStatus } from '../../models/work-item.models';

type StatusStage = 'initial' | 'in-progress' | 'done';

/**
 * A status as its name plus an icon whose shape and colour tell the stage: an empty circle where items start, a half circle
 * while they are being worked on, a checked circle when they are done. Shape carries the meaning as well as colour, so it
 * survives colour blindness, and every colour pair is a token that passes WCAG AA (3:1 for the icon, 4.5:1 for the text)
 * against the page background in both light and dark mode. Tenant workflows may hold any statuses; only their stage decides
 * how they look.
 */
@Component({
  selector: 'app-status-label',
  host: { class: 'inline-flex items-center gap-2' },
  templateUrl: './status-label.html',
})
export class StatusLabel {
  readonly status = input.required<WorkItemStatus>();

  /** Whole class names, so Tailwind finds them; each light/dark pair is contrast-checked against the page backgrounds. */
  protected readonly iconColor = computed(() => {
    switch (this.stage()) {
      case 'initial':
        return 'text-neutral-700 dark:text-neutral-400';
      case 'in-progress':
        return 'text-info-800 dark:text-info-300';
      case 'done':
        return 'text-success-800 dark:text-success-300';
    }
  });

  protected readonly stage = computed<StatusStage>(() => {
    const status = this.status();
    if (status.isTerminal) {
      return 'done';
    }
    return status.isInitial ? 'initial' : 'in-progress';
  });
}
