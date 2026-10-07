import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Permissions } from '../../../auth/services/permissions.service';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { Banner } from '../../../shared/ui/banner/banner';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { SelectMenu, SelectMenuOption } from '../../../shared/ui/select-menu/select-menu';
import { DataTable, DataTableCell, DataTableColumn } from '../../../shared/ui/data-table/data-table';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { NotAllowed } from '../../../shared/ui/not-allowed/not-allowed';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Panel } from '../../../shared/ui/panel/panel';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { ITEM_TYPE_LABELS, ITEM_TYPES, ItemType } from '../../models/work-item.models';
import { Workflow, WorkItemService } from '../../services/work-item.service';

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
  imports: [
    PageHeader,
    Panel,
    Button,
    Chip,
    Banner,
    SelectMenu,
    Checkbox,
    DataTable,
    DataTableCell,
    EmptyState,
    ErrorState,
    NotAllowed,
    TextLink,
  ],
  templateUrl: './workflow-admin.html',
  host: { class: 'mx-auto flex max-w-5xl flex-col gap-4' },
})
export class WorkflowAdmin {
  private readonly workItems = inject(WorkItemService);
  private readonly notifications = inject(NotificationService);

  protected readonly permissions = inject(Permissions);
  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly typeOptions: readonly SelectMenuOption[] = ITEM_TYPES.map((type) => ({ value: type, label: ITEM_TYPE_LABELS[type] }));

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

  protected readonly statusColumns: readonly DataTableColumn<StatusRow>[] = [
    { header: 'Código' },
    { header: 'Nombre para mostrar' },
    { header: 'Orden' },
    { header: 'Final' },
    { header: 'Acciones' },
  ];
  protected readonly transitionColumns: readonly DataTableColumn<TransitionRow>[] = [
    { header: 'De' },
    { header: 'A' },
    { header: 'Permite retroceder' },
    { header: 'Acciones' },
  ];
  protected readonly previewStatusColumns: readonly DataTableColumn<StatusRow>[] = [
    { header: 'Nombre' },
    { header: 'Orden', numeric: true },
    { header: 'Terminal' },
  ];

  /** Rows are tracked by position, so typing in one does not rebuild it (and lose the caret). */
  protected readonly trackStatus = (row: StatusRow) => this.statuses().indexOf(row);
  protected readonly trackTransition = (row: TransitionRow) => this.transitions().indexOf(row);
  protected readonly trackPreviewStatus = (row: StatusRow) => row.code;

  protected readonly statusOptions = computed<SelectMenuOption[]>(() => this.statuses().map((status) => ({ value: status.code, label: status.code })));

  /** The read-only preview a member sees: statuses in order, transitions named by display name. */
  protected readonly orderedStatuses = computed(() => [...this.statuses()].sort((a, b) => a.order - b.order));
  protected readonly previewTransitions = computed(() =>
    this.transitions().map((transition) => ({
      from: this.statusName(transition.from),
      to: this.statusName(transition.to),
      allowedBackward: transition.allowedBackward,
    })),
  );

  protected indexOfStatus(row: StatusRow): number {
    return this.statuses().indexOf(row);
  }

  protected indexOfTransition(row: TransitionRow): number {
    return this.transitions().indexOf(row);
  }

  private statusName(code: string): string {
    return this.statuses().find((status) => status.code === code)?.displayName || code;
  }

  protected selectType(value: string): void {
    this.itemType.set(value as ItemType);
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

  protected onStatusTerminal(index: number, checked: boolean): void {
    this.updateStatus(index, { isTerminal: checked });
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

  protected onTransitionFrom(index: number, value: string): void {
    this.updateTransition(index, { from: value });
  }

  protected onTransitionTo(index: number, value: string): void {
    this.updateTransition(index, { to: value });
  }

  protected onTransitionBackward(index: number, checked: boolean): void {
    this.updateTransition(index, { allowedBackward: checked });
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
