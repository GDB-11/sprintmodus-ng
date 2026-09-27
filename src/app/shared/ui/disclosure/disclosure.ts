import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** Wraps a native `<details>` so keyboard and screen-reader disclosure behaviour is the browser's. */
@Component({
  selector: 'details[appDisclosure]',
  imports: [Icon],
  templateUrl: './disclosure.html',
  host: {
    class: 'group',
  },
})
export class Disclosure {
  readonly summary = input.required<string>();
}
