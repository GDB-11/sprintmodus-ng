import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../ui/button/button';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { Icon } from '../../ui/icon/icon';
import { ConnectionIndicator } from '../connection-indicator/connection-indicator';
import { GlobalSearch } from '../global-search/global-search';
import { NotificationsPopover } from '../notifications-popover/notifications-popover';
import { ProjectSwitcher } from '../project-switcher/project-switcher';
import { ShellBreadcrumb } from '../shell-breadcrumb/shell-breadcrumb';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { UserMenu } from '../user-menu/user-menu';

/** Sticky, 56px: hamburger (phone), project switcher, breadcrumb, search, "+ Nuevo", connection, notifications, theme, account. */
@Component({
  selector: 'app-shell-topbar',
  imports: [
    RouterLink,
    Button,
    Icon,
    ProjectSwitcher,
    ShellBreadcrumb,
    GlobalSearch,
    ConnectionIndicator,
    NotificationsPopover,
    ThemeToggle,
    UserMenu,
  ],
  templateUrl: './shell-topbar.html',
})
export class ShellTopbar {
  protected readonly context = inject(ProjectContextService);
  protected readonly searchOpen = signal(false);

  readonly menuToggle = output<void>();
}
