import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Badge } from '../../ui/badge/badge';
import { DisabledReason } from '../../ui/disabled-reason/disabled-reason';
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
  /** True in the sidebar, whose width is a rail below `lg` so labels hide there; false in the drawer, which is always wide. */
  readonly responsive = input(true);
  readonly disabledReason = input<string>();
  readonly badgeCount = input<number | null>(null);

  protected readonly tileClasses = computed(
    () => `inline-flex size-8 shrink-0 items-center transition-transform duration-200 group-hover:scale-110 justify-center rounded-lg text-white ${this.disabledReason() ? 'bg-neutral-500 opacity-60' : TONE_CLASSES[this.item().tone]}`,
  );

  protected readonly labelState = computed(() => {
    if (!this.expanded()) {
      return 'max-w-0 opacity-0';
    }
    return this.responsive() ? 'max-w-0 opacity-0 lg:ml-3 lg:max-w-44 lg:opacity-100' : 'ml-3 max-w-44 opacity-100';
  });

  /** The badge is decorative (`app-badge` is `aria-hidden`); the count is said here instead, so it's never colour/shape alone. */
  protected readonly ariaLabel = computed(() => {
    const count = this.badgeCount();
    return count && count > 0 ? `${this.item().label}, ${count} sin leer` : null;
  });
}
