import { Component, booleanAttribute, computed, input } from '@angular/core';

/**
 * A card on a board: the translucent control-fill surface with a hairline border, 10px radius. Wraps a native `<article>`.
 * `pending` dims it while the server has not answered what the user did with it.
 */
@Component({
  selector: 'article[appCard]',
  templateUrl: './card.html',
  host: {
    '[class]': 'classes()',
  },
})
export class Card {
  readonly pending = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(
    () =>
      'flex flex-col gap-2 rounded-[10px] border border-control-border bg-control-track p-3 text-sm text-text ' +
      'transition-opacity duration-150 ' +
      (this.pending() ? 'opacity-60' : ''),
  );
}
