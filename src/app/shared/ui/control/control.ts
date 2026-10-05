import { Directive } from '@angular/core';

/**
 * The same control look `app-text-field`/`app-textarea-field`/`app-select-field` use, for a native `<select>`,
 * `<input>` or `<textarea>` that isn't bound to a Signal Forms field (a status/sprint/parent move control, a plain
 * search box...). Labelling and validation stay the caller's; this is the border/background/focus recipe only.
 *
 * A plain `@Directive`, not a `@Component`: it must not shadow a local template reference (`#ref`) a caller puts on
 * the same element to reach the native control (`app-mention-field` does exactly that) — Angular resolves `#ref` to
 * a *component* instance when one sits on the element, but leaves it as the native element for a directive.
 */
@Directive({
  selector: 'select[appControl], input[appControl], textarea[appControl]',
  host: {
    class:
      'rounded-[10px] border border-control-border bg-control-track px-3 py-2 text-text ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 ' +
      'disabled:opacity-60 dark:focus-visible:outline-secondary-400',
  },
})
export class Control {}
