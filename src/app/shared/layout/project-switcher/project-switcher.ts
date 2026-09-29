import { OverlayModule } from '@angular/cdk/overlay';
import { Component, computed, inject, signal } from '@angular/core';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { Project } from '../../../projects/models/project.models';
import { valueOf } from '../../resource-value';
import { Icon } from '../../ui/icon/icon';
import { Popover } from '../../ui/popover/popover';

/** Which project the shell (and, as screens migrate, the screens themselves) shows -- one control instead of a per-page select. */
@Component({
  selector: 'app-project-switcher',
  imports: [OverlayModule, Icon, Popover],
  templateUrl: './project-switcher.html',
})
export class ProjectSwitcher {
  protected readonly context = inject(ProjectContextService);

  protected readonly open = signal(false);
  protected readonly projects = computed(() => valueOf(this.context.projects) ?? []);
  protected readonly isLoading = computed(() => this.context.projects.isLoading());

  protected choose(project: Project): void {
    this.context.select(project.projectCode);
    this.open.set(false);
  }
}
