import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { valueOf } from '../../../shared/resource-value';
import {
  Link,
  LINK_TYPE_LABELS,
  LINK_TYPES,
  LinkType,
  WorkItemSummary,
} from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { StatusLabel } from '../status-label/status-label';

const SELECT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';

/** The relationships of a work item to other items (possibly in other projects). Creating and removing a link goes
 * straight to the backend; the parent reloads the item afterward, since links are part of its detail, not a separate
 * resource this component owns. */
@Component({
  selector: 'app-work-item-links',
  imports: [RouterLink, StatusLabel],
  templateUrl: './work-item-links.html',
})
export class WorkItemLinks {
  private readonly workItems = inject(WorkItemService);

  readonly workItemCode = input.required<string>();
  readonly links = input.required<readonly Link[]>();
  readonly changed = output<void>();

  protected readonly selectClasses = SELECT_CLASSES;
  protected readonly linkTypes = LINK_TYPES;
  protected readonly linkTypeLabels = LINK_TYPE_LABELS;

  protected readonly adding = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly type = signal<LinkType>('RELATED_TO');
  protected readonly query = signal('');
  protected readonly picked = signal<WorkItemSummary | null>(null);

  protected readonly candidates = rxResource({
    params: () => (this.picked() || this.query().trim().length < 2 ? undefined : this.query().trim()),
    stream: ({ params }) => this.workItems.list({ q: params, size: 20 }),
  });

  protected readonly candidateOptions = computed(() =>
    (valueOf(this.candidates)?.items ?? []).filter((candidate) => candidate.workItemCode !== this.workItemCode()),
  );

  protected startAdding(): void {
    this.adding.set(true);
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.adding.set(false);
    this.query.set('');
    this.picked.set(null);
    this.errorMessage.set(null);
  }

  protected onType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as LinkType);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected pick(candidate: WorkItemSummary): void {
    this.picked.set(candidate);
  }

  protected changePick(): void {
    this.picked.set(null);
  }

  protected async add(): Promise<void> {
    const target = this.picked();
    if (!target) {
      return;
    }
    this.errorMessage.set(null);
    this.busy.set(true);
    try {
      await firstValueFrom(this.workItems.createLink(this.workItemCode(), target.workItemCode, this.type()));
      this.cancel();
      this.changed.emit();
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo crear la relación.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(linkCode: string): Promise<void> {
    this.errorMessage.set(null);
    this.busy.set(true);
    try {
      await firstValueFrom(this.workItems.removeLink(this.workItemCode(), linkCode));
      this.changed.emit();
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo quitar la relación.'));
    } finally {
      this.busy.set(false);
    }
  }
}
