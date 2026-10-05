import { Component } from '@angular/core';

/** A field's own validation message, the recipe `app-text-field`/`app-textarea-field`/`app-select-field` render
 * inline; a feature template that draws its own control (e.g. `app-mention-field`) uses this instead of repeating it. */
@Component({
  selector: 'app-field-error',
  templateUrl: './field-error.html',
  host: { role: 'alert', class: 'text-sm font-medium text-error-800 dark:text-error-300' },
})
export class FieldError {}
