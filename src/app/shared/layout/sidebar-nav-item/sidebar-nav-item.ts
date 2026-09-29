import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Badge } from '../../ui/badge/badge';
import { DisabledReason } from '../../ui/disabled-reason/disabled-reason';
import { Icon } from '../../ui/icon/icon';
import { NavItem } from '../nav-items';

/**
 * One entry of `NAV_ITEMS`, shared by the sidebar and the drawer. When `disabledReason` is set it renders read-only
 * with the reason visible (CLAUDE.md: "what the user may not do is shown, disabled, with the reason"), never hidden.
 */
@Component({
  selector: 'app-sidebar-nav-item',
  imports: [RouterLink, RouterLinkActive, Icon, Badge, DisabledReason],
  templateUrl: './sidebar-nav-item.html',
})
export class SidebarNavItem {
  readonly item = input.required<NavItem>();
  /** Whether the label is shown as text (desktop, expanded) or only to screen readers (rail/tablet). */
  readonly expanded = input(true);
  readonly disabledReason = input<string>();
  readonly badgeCount = input<number | null>(null);

  /** The badge is decorative (`app-badge` is `aria-hidden`); the count is said here instead, so it's never colour/shape alone. */
  protected readonly ariaLabel = computed(() => {
    const count = this.badgeCount();
    return count && count > 0 ? `${this.item().label}, ${count} sin leer` : null;
  });
}
