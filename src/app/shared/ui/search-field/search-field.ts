import { Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/** A labelled search box with a leading icon. Two-way bound via `[(value)]`. */
@Component({
  selector: 'app-search-field',
  imports: [Icon],
  templateUrl: './search-field.html',
})
export class SearchField {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly placeholder = input('');
}
