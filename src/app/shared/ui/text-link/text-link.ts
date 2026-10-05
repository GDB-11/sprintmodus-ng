import { Component } from '@angular/core';

/**
 * Wraps a native `<a>`/`<button>` with the underlined inline-link look (a work item key, "Ver como tablero", "Cambiar"...),
 * the one recipe every screen used to repeat as its own `text-secondary-900 underline...` classes.
 */
@Component({
  selector: 'a[appTextLink], button[appTextLink]',
  templateUrl: './text-link.html',
  host: {
    class:
      'font-medium text-secondary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
      'focus-visible:outline-secondary-900 dark:text-secondary-400 dark:focus-visible:outline-secondary-400',
  },
})
export class TextLink {}
