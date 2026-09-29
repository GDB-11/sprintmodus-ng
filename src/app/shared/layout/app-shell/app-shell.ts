import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellDrawer } from '../shell-drawer/shell-drawer';
import { ShellSidebar } from '../shell-sidebar/shell-sidebar';
import { ShellTopbar } from '../shell-topbar/shell-topbar';

/**
 * The layout every authenticated route renders inside (Phase 16): the top bar and sidebar exist only here (CLAUDE.md,
 * Components: "the chrome exists once"). Skip links let keyboard users jump past them straight to the navigation or the
 * page content.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ShellTopbar, ShellSidebar, ShellDrawer],
  templateUrl: './app-shell.html',
})
export class AppShell {
  protected readonly drawerOpen = signal(false);
}
