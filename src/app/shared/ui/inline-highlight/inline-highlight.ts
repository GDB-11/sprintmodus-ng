import { Component } from '@angular/core';

/** A highlighted inline run of text (a `@mention` inside a comment, today; any future "this word matters" span). */
@Component({
  selector: 'span[appInlineHighlight]',
  templateUrl: './inline-highlight.html',
  host: { class: 'rounded-sm bg-secondary-100 px-1 font-semibold text-secondary-900 dark:bg-secondary-900 dark:text-secondary-100' },
})
export class InlineHighlight {}
