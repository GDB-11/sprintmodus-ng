import { Component, computed, inject, input } from '@angular/core';
import { Permissions } from '../../../auth/services/permissions.service';
import { InboxService } from '../../../notifications/services/inbox.service';
import { NAV_ITEMS, NavItem } from '../nav-items';
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
  /** The sidebar is a rail below `lg`; the drawer passes `false` because it is always wide. */
  readonly responsive = input(true);

  /** Admin-only entries are left out for anyone who may not open them. */
  protected readonly items = computed(() =>
    NAV_ITEMS.filter((item) => !item.adminOnly || this.permissions.canAdminister()),
  );

  protected badgeCountOf(item: NavItem): number | null {
    return item.badge === 'notifications' ? (this.inbox.unreadCount() ?? 0) : null;
  }
}
