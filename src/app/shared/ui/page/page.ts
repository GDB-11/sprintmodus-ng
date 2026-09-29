import { Component, input } from '@angular/core';
import { PageHeader } from '../page-header/page-header';

/**
 * Adapter kept so the 8 screens built before the redesign (Phase 15) render inside `app-shell` (Phase 16) unedited: it
 * takes the same inputs as before, but renders no `<main>` (the shell owns that landmark and the page background) and
 * delegates the heading/back-link/actions to `app-page-header`. The bell that used to sit next to the heading is now the
 * shell topbar's `notifications-popover`. Phases 17-19 switch each screen to `app-page-header` directly, and Phase 19
 * deletes this adapter.
 */
@Component({
  selector: 'app-page',
  imports: [PageHeader],
  templateUrl: './page.html',
})
export class Page {
  readonly heading = input.required<string>();
  readonly backLink = input<string | readonly unknown[]>();
  readonly backLabel = input('Volver');
}
