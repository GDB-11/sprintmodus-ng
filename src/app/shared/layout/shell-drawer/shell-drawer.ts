import { Component, ElementRef, ViewChild, effect, inject, model, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Icon } from '../../ui/icon/icon';
import { ShellNavList } from '../shell-nav-list/shell-nav-list';

/**
 * The phone navigation: a native `<dialog>` gives a real focus trap, Escape-to-close and a `::backdrop` for free, and
 * restores focus to whatever opened it (the top bar's hamburger) when it closes. Closes on a route change too.
 */
@Component({
  selector: 'app-shell-drawer',
  imports: [ShellNavList, Icon],
  templateUrl: './shell-drawer.html',
})
export class ShellDrawer {
  readonly open = model(false);

  @ViewChild('dialogEl') private readonly dialogEl?: ElementRef<HTMLDialogElement>;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      untracked(() => {
        const dialog = this.dialogEl?.nativeElement;
        if (!dialog) {
          return;
        }
        if (isOpen && !dialog.open) {
          // `showModal` is unimplemented in the jsdom used for specs; the `open` attribute still lets them assert state.
          typeof dialog.showModal === 'function' ? dialog.showModal() : dialog.setAttribute('open', '');
        } else if (!isOpen && dialog.open) {
          typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open');
        }
      });
    });

    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  /** A click that landed on the `<dialog>` itself (not its content) is a click on its backdrop. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl?.nativeElement) {
      this.open.set(false);
    }
  }

  protected onNativeClose(): void {
    this.open.set(false);
  }
}
