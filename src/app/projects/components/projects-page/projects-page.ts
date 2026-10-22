import { Component, computed, inject, signal } from '@angular/core';
import { Permissions } from '../../../auth/services/permissions.service';
import { ProjectService } from '../../services/project.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Project } from '../../models/project.models';
import { ProjectContextService } from '../../services/project-context.service';
import { valueOf } from '../../../shared/resource-value';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import {
  DataTable,
  DataTableCell,
  DataTableColumn,
} from '../../../shared/ui/data-table/data-table';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { Icon } from '../../../shared/ui/icon/icon';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Panel } from '../../../shared/ui/panel/panel';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ProjectCreate } from '../project-create/project-create';
import { ProjectEdit } from '../project-edit/project-edit';

/**
 * "Proyectos": the organization's projects, a form to add one, and editing (anyone) or deleting (owners and admins) each.
 * A new project becomes the one the shell shows; when the current one is deleted the shell falls back to the first left.
 */
@Component({
  selector: 'app-projects-page',
  imports: [
    PageHeader,
    Panel,
    Button,
    Icon,
    Chip,
    DataTable,
    DataTableCell,
    EmptyState,
    ErrorState,
    Skeleton,
    ProjectCreate,
    ProjectEdit,
    ConfirmDialog,
  ],
  templateUrl: './projects-page.html',
  host: { class: 'mx-auto flex max-w-5xl flex-col gap-4' },
})
export class ProjectsPage {
  protected readonly context = inject(ProjectContextService);

  private readonly projects = inject(ProjectService);
  private readonly notifications = inject(NotificationService);
  protected readonly canAdminister = inject(Permissions).canAdminister;

  protected readonly creating = signal(false);
  protected readonly editTarget = signal<Project | null>(null);
  protected readonly editOpen = signal(false);
  protected readonly deleteTarget = signal<Project | null>(null);
  protected readonly deleteOpen = signal(false);
  protected readonly deleting = signal(false);
  protected readonly list = computed(() => valueOf(this.context.projects) ?? []);

  protected readonly columns: DataTableColumn<Project>[] = [
    { header: 'Proyecto' },
    { header: 'Clave' },
    { header: 'Descripción' },
    { header: 'Seleccionado' },
    { header: 'Acciones' },
  ];
  protected readonly trackByProject = (project: Project) => project.projectCode;

  protected isCurrent(project: Project): boolean {
    return this.context.current()?.projectCode === project.projectCode;
  }

  protected askEdit(project: Project): void {
    this.editTarget.set(project);
    this.editOpen.set(true);
  }

  protected askDelete(project: Project): void {
    this.deleteTarget.set(project);
    this.deleteOpen.set(true);
  }

  protected confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    this.deleting.set(true);
    this.projects.delete(target.projectCode).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.notifications.success(`Se eliminó ${target.name}.`);
        this.context.projects.reload();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.notifications.error(apiErrorMessage(error, 'No se pudo eliminar el proyecto.'));
      },
    });
  }

  protected onCreated(project: Project): void {
    this.creating.set(false);
    this.context.projects.reload();
    this.context.select(project.projectCode);
  }
}
