import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { valueOf } from '../../resource-value';
import { TenantContextService } from '../../../tenant/services/tenant-context.service';
import { SUBSCRIPTION_PLAN_LABELS } from '../../../auth/models/auth.models';
import { Icon } from '../../ui/icon/icon';
import { Logo } from '../../ui/logo/logo';
import { Meter } from '../../ui/meter/meter';
import { ShellNavList } from '../shell-nav-list/shell-nav-list';
import { SidebarStateService } from '../sidebar-state.service';

/**
 * The desktop/tablet navigation: 240px with labels, or a 64px icon rail (tablet is always a rail; see `SidebarStateService`
 * for when desktop is one too). Below `md` it renders nothing -- `shell-drawer` is the phone equivalent.
 */
@Component({
  selector: 'app-shell-sidebar',
  imports: [RouterLink, ShellNavList, Icon, Logo, Meter],
  templateUrl: './shell-sidebar.html',
})
export class ShellSidebar {
  protected readonly sidebarState = inject(SidebarStateService);
  protected readonly tenant = inject(TenantContextService).tenant;
  private readonly projectContext = inject(ProjectContextService);

  protected readonly widthClasses = computed(() => (this.sidebarState.collapsed() ? 'md:w-16 lg:w-16' : 'md:w-16 lg:w-60'));
  protected readonly expanded = computed(() => !this.sidebarState.collapsed());

  protected readonly projectsUsed = computed(() => valueOf(this.projectContext.projects)?.length ?? 0);

  protected readonly planLabel = computed(() => {
    const plan = this.tenant()?.plan;
    return plan ? SUBSCRIPTION_PLAN_LABELS[plan] : '';
  });

  protected toggle(): void {
    this.sidebarState.toggle();
  }
}
