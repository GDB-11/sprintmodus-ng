import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Badge } from '../../ui/badge/badge';
import { Icon } from '../../ui/icon/icon';
import { NavItem, NavTone } from '../nav-items';

const TONE_CLASSES: Record<NavTone, string> = {
  primary: 'bg-primary-700',
  secondary: 'bg-secondary-500',
  info: 'bg-info-700',
  success: 'bg-success-700',
  warning: 'bg-warning-700',
  neutral: 'bg-neutral-500',
};

/**
 * One entry of `NAV_ITEMS`, shared by the sidebar and the drawer. Entries the user may not open are filtered out by
 * the caller
 */
@Component({
  selector: 'app-sidebar-nav-item',
  imports: [RouterLink, RouterLinkActive, Icon, Badge],
  templateUrl: './sidebar-nav-item.html',
})
export class SidebarNavItem {
  readonly item = input.required<NavItem>();
  /** Whether the label is shown as text (desktop, expanded) or only to screen readers (rail/tablet). */
  readonly expanded = input(true);
  /** True in the sidebar, whose width is a rail below `lg` so labels hide there; false in the drawer, which is always wide. */
  readonly responsive = input(true);
  readonly badgeCount = input<number | null>(null);

  protected readonly tileClasses = computed(
    () => `inline-flex size-8 shrink-0 items-center transition-transform duration-200 group-hover:scale-110 justify-center rounded-lg text-white ${TONE_CLASSES[this.item().tone]}`,
  );

  protected readonly labelState = computed(() => {
    if (!this.expanded()) {
      return 'max-w-0 opacity-0';
    }
    return this.responsive() ? 'max-w-0 opacity-0 lg:ml-3 lg:max-w-44 lg:opacity-100' : 'ml-3 max-w-44 opacity-100';
  });

  /** The badge is decorative (`app-badge` is `aria-hidden`); the count is said in words for screen readers, so it's never
   * colour/shape alone. It is text inside the link rather than an `aria-label`: the name then follows the visible text
   * (WCAG 2.5.3). */
  protected readonly unreadWords = computed(() => {
    const count = this.badgeCount();
    return count && count > 0 ? `${count > 99 ? '99+' : count} sin leer` : null;
  });
}
