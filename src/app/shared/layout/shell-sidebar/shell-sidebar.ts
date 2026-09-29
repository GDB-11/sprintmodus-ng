import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { valueOf } from '../../resource-value';
import { TenantContextService } from '../../../tenant/services/tenant-context.service';
import { UserService } from '../../../users/services/user.service';
import { Icon } from '../../ui/icon/icon';
import { Meter } from '../../ui/meter/meter';
import { ShellNavList } from '../shell-nav-list/shell-nav-list';
import { SidebarStateService } from '../sidebar-state.service';

/**
 * The desktop/tablet navigation: 212px with labels, or a 64px icon rail (tablet is always a rail; see `SidebarStateService`
 * for when desktop is one too). Below `md` it renders nothing -- `shell-drawer` is the phone equivalent.
 */
@Component({
  selector: 'app-shell-sidebar',
  imports: [ShellNavList, Icon, Meter],
  templateUrl: './shell-sidebar.html',
})
export class ShellSidebar {
  protected readonly sidebarState = inject(SidebarStateService);
  protected readonly tenant = inject(TenantContextService).tenant;
  private readonly projectContext = inject(ProjectContextService);
  private readonly userService = inject(UserService);

  protected readonly widthClasses = computed(() => (this.sidebarState.collapsed() ? 'md:w-16 lg:w-16' : 'md:w-16 lg:w-[212px]'));
  protected readonly expanded = computed(() => !this.sidebarState.collapsed());

  protected readonly projectsUsed = computed(() => valueOf(this.projectContext.projects)?.length ?? 0);

  private readonly usersCount = rxResource({ stream: () => this.userService.count() });
  protected readonly usersUsed = computed(() => valueOf(this.usersCount)?.count ?? 0);

  protected toggle(): void {
    this.sidebarState.toggle();
  }
}
