import { Component, computed, inject } from '@angular/core';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { valueOf } from '../../resource-value';
import { SelectMenu, SelectMenuOption } from '../../ui/select-menu/select-menu';

/** Which project the shell (and, as screens migrate, the screens themselves) shows -- one control instead of a per-page select. */
@Component({
  selector: 'app-project-switcher',
  imports: [SelectMenu],
  templateUrl: './project-switcher.html',
})
export class ProjectSwitcher {
  protected readonly context = inject(ProjectContextService);

  protected readonly isLoading = computed(() => this.context.projects.isLoading());
  protected readonly options = computed<SelectMenuOption[]>(() =>
    (valueOf(this.context.projects) ?? []).map((project) => ({ value: project.projectCode, label: project.name, hint: project.key })),
  );

  protected choose(projectCode: string | null): void {
    if (projectCode) {
      this.context.select(projectCode);
    }
  }
}
