import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The one `<h1>` a page gets, plus an optional back link and an actions slot. */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly backLink = input<string | readonly unknown[]>();
  readonly backLabel = input('Volver');
}
