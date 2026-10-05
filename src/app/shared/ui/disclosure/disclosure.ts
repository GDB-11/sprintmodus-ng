import { Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Wraps a native `<details>` so keyboard and screen-reader disclosure behaviour is the browser's. `summary` is a plain
 * text label; project richer content (e.g. a `app-work-item-row`) into `[disclosureSummary]` instead when a component
 * needs to be the summary, and read `toggled` when a consumer needs to react to open/close (e.g. to lazy-load).
 */
@Component({
  selector: 'details[appDisclosure]',
  imports: [Icon],
  templateUrl: './disclosure.html',
  host: {
    class: 'group',
    '(toggle)': 'toggled.emit($any($event.target).open)',
  },
})
export class Disclosure {
  readonly summary = input<string>();
  readonly toggled = output<boolean>();
}
