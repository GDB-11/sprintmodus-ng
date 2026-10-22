import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UserService } from '../../../users/services/user.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { valueOf } from '../../../shared/resource-value';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { Panel } from '../../../shared/ui/panel/panel';
import { SearchableSelect } from '../../../shared/ui/searchable-select/searchable-select';
import { SelectMenu, SelectMenuOption } from '../../../shared/ui/select-menu/select-menu';
import { ASSIGNMENT_ROLE_LABELS, Assignee, AssignmentRole } from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';

/** The most the people search returns in one answer (`SearchUsersUseCase.MAX_LIMIT`). */
const PEOPLE_LIMIT = 50;
const ROLES = Object.keys(ASSIGNMENT_ROLE_LABELS) as AssignmentRole[];

/** Who works on an item and in which role: the current assignees (removable) and a person + role picker to add one. */
@Component({
  selector: 'app-work-item-assignees',
  imports: [Panel, Chip, Button, EmptyState, SearchableSelect, SelectMenu],
  templateUrl: './work-item-assignees.html',
})
export class WorkItemAssignees {
  private readonly workItems = inject(WorkItemService);
  private readonly users = inject(UserService);
  private readonly notifications = inject(NotificationService);

  readonly workItemCode = input.required<string>();
  readonly assignees = input.required<readonly Assignee[]>();
  /** An assignment was added or removed: the page should reload the item. */
  readonly changed = output<void>();

  protected readonly roleLabels = ASSIGNMENT_ROLE_LABELS;
  protected readonly roleOptions: SelectMenuOption[] = ROLES.map((role) => ({ value: role, label: ASSIGNMENT_ROLE_LABELS[role] }));

  protected readonly userChoice = signal('');
  protected readonly roleChoice = signal<string>('DEV');
  protected readonly busy = signal(false);

  private readonly people = rxResource({ stream: () => this.users.search('', PEOPLE_LIMIT) });
  protected readonly peopleEmptyText = computed(() =>
    this.people.error() ? 'No se pudo cargar la lista de personas.' : 'Ningún resultado.',
  );
  protected readonly userOptions = computed<SelectMenuOption[]>(() =>
    (valueOf(this.people) ?? []).map((user) => ({ value: user.userCode, label: user.fullName })),
  );

  protected assign(): void {
    const userCode = this.userChoice();
    if (!userCode) return;
    this.busy.set(true);
    this.workItems.assign(this.workItemCode(), userCode, this.roleChoice() as AssignmentRole).subscribe({
      next: (assignee) => {
        this.busy.set(false);
        this.userChoice.set('');
        this.notifications.success(`${assignee.fullName} quedó asignado/a como ${ASSIGNMENT_ROLE_LABELS[assignee.role]}.`);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notifications.error(apiErrorMessage(error, 'No se pudo asignar a la persona.'));
      },
    });
  }

  protected remove(assignee: Assignee): void {
    this.busy.set(true);
    this.workItems.unassign(this.workItemCode(), assignee.assignmentCode).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success(`Se quitó a ${assignee.fullName}.`);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notifications.error(apiErrorMessage(error, 'No se pudo quitar la asignación.'));
      },
    });
  }
}
