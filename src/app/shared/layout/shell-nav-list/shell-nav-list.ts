import { Component, inject, input } from '@angular/core';
import { Permissions } from '../../../auth/services/permissions.service';
import { InboxService } from '../../../notifications/services/inbox.service';
import { ADMIN_ONLY_REASON, NAV_ITEMS, NavItem } from '../nav-items';
import { SidebarNavItem } from '../sidebar-nav-item/sidebar-nav-item';

/** `NAV_ITEMS` rendered as a `<nav>`, shared by `shell-sidebar` (expanded or railed) and `shell-drawer` (always expanded). */
@Component({
  selector: 'app-shell-nav-list',
  imports: [SidebarNavItem],
  templateUrl: './shell-nav-list.html',
})
export class ShellNavList {
  private readonly permissions = inject(Permissions);
  private readonly inbox = inject(InboxService);

  readonly expanded = input(true);

  protected readonly items = NAV_ITEMS;

  protected disabledReasonOf(item: NavItem): string | undefined {
    return item.adminOnly && !this.permissions.canAdminister() ? ADMIN_ONLY_REASON : undefined;
  }

  protected badgeCountOf(item: NavItem): number | null {
    return item.badge === 'notifications' ? (this.inbox.unreadCount() ?? 0) : null;
  }
}
