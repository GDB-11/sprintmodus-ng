import { Component } from '@angular/core';

/** Wraps a native `<button>` as a full-width, left-aligned row of a compact list (the notifications popover). */
@Component({
  selector: 'button[appListButton]',
  templateUrl: './list-button.html',
  host: {
    class:
      'flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-control-track ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:focus-visible:outline-secondary-400',
  },
})
export class ListButton {}
