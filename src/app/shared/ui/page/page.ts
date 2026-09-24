import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Page shell of the signed-in area: heading, a way back and the page content. */
@Component({
  selector: 'app-page',
  imports: [RouterLink],
  templateUrl: './page.html',
})
export class Page {
  readonly heading = input.required<string>();
  readonly backLink = input<string | readonly unknown[]>();
  readonly backLabel = input('Back');
}
