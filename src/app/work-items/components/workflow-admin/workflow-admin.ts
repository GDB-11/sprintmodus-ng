import { Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Page } from '../../../shared/ui/page/page';
import { ITEM_TYPE_LABELS, ITEM_TYPES, ItemType } from '../../models/work-item.models';
import { Workflow, WorkItemService } from '../../services/work-item.service';

const SELECT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-3 py-2 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 disabled:opacity-60 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';
const CELL_INPUT_CLASSES =
  'rounded-md border border-neutral-700 bg-light-surface-tertiary px-2 py-1 text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:border-neutral-400 dark:bg-dark-bg dark:text-neutral-100 dark:focus-visible:outline-secondary-400';

interface StatusRow {
  code: string;
  displayName: string;
  order: number;
  isTerminal: boolean;
}

interface TransitionRow {
  from: string;
  to: string;
  allowedBackward: boolean;
}

/**
 * Lets an owner or admin replace the whole workflow (statuses + transitions) of an item type. The backend matches
 * statuses by code, so a status that keeps its code keeps the items in it; one that is dropped is rejected if any active
 * item is still in it (`STATUS_IN_USE`), with a message naming how many.
 */
@Component({
  selector: 'app-workflow-admin',
  imports: [Page],
  templateUrl: './workflow-admin.html',
})
export class WorkflowAdmin {
  private readonly workItems = inject(WorkItemService);
  private readonly notifications = inject(NotificationService);

  protected readonly selectClasses = SELECT_CLASSES;
  protected readonly cellInputClasses = CELL_INPUT_CLASSES;
  protected readonly itemTypes = ITEM_TYPES;
  protected readonly typeLabels = ITEM_TYPE_LABELS;

  protected readonly itemType = signal<ItemType>('EPIC');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly workflow = rxResource({
    params: () => this.itemType(),
    stream: ({ params }) => this.workItems.workflow(params),
  });

  /** Editable copies of the loaded workflow; replaced whenever the item type changes or the server data reloads. */
  protected readonly statuses = linkedSignal<StatusRow[]>(() =>
    (valueOf(this.workflow)?.statuses ?? []).map((status) => ({ ...status })),
  );
  protected readonly transitions = linkedSignal<TransitionRow[]>(() =>
    (valueOf(this.workflow)?.transitions ?? []).map((transition) => ({ ...transition })),
  );

  protected selectType(event: Event): void {
    this.itemType.set((event.target as HTMLSelectElement).value as ItemType);
    this.errorMessage.set(null);
  }

  protected addStatus(): void {
    this.statuses.update((rows) => [
      ...rows,
      { code: '', displayName: '', order: rows.length + 1, isTerminal: false },
    ]);
  }

  protected removeStatus(index: number): void {
    this.statuses.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected onStatusCode(index: number, event: Event): void {
    this.updateStatus(index, { code: (event.target as HTMLInputElement).value.toUpperCase() });
  }

  protected onStatusName(index: number, event: Event): void {
    this.updateStatus(index, { displayName: (event.target as HTMLInputElement).value });
  }

  protected onStatusOrder(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.updateStatus(index, { order: Number.isFinite(value) && value > 0 ? value : 1 });
  }

  protected onStatusTerminal(index: number, event: Event): void {
    this.updateStatus(index, { isTerminal: (event.target as HTMLInputElement).checked });
  }

  private updateStatus(index: number, patch: Partial<StatusRow>): void {
    this.statuses.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  protected addTransition(): void {
    const first = this.statuses()[0]?.code ?? '';
    this.transitions.update((rows) => [...rows, { from: first, to: first, allowedBackward: false }]);
  }

  protected removeTransition(index: number): void {
    this.transitions.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected onTransitionFrom(index: number, event: Event): void {
    this.updateTransition(index, { from: (event.target as HTMLSelectElement).value });
  }

  protected onTransitionTo(index: number, event: Event): void {
    this.updateTransition(index, { to: (event.target as HTMLSelectElement).value });
  }

  protected onTransitionBackward(index: number, event: Event): void {
    this.updateTransition(index, { allowedBackward: (event.target as HTMLInputElement).checked });
  }

  private updateTransition(index: number, patch: Partial<TransitionRow>): void {
    this.transitions.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  /** Discards local edits, reloading the item type's workflow as the server has it. */
  protected discard(): void {
    this.errorMessage.set(null);
    this.workflow.reload();
  }

  protected async save(): Promise<void> {
    this.errorMessage.set(null);
    this.saving.set(true);
    const request: Workflow = {
      itemType: this.itemType(),
      statuses: this.statuses(),
      transitions: this.transitions(),
    };
    try {
      const saved = await firstValueFrom(this.workItems.upsertWorkflow(request));
      this.workflow.set(saved);
      this.notifications.success('Flujo de trabajo guardado.');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo guardar el flujo de trabajo.'));
    } finally {
      this.saving.set(false);
    }
  }
}
