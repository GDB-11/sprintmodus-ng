import { Component, booleanAttribute, input } from '@angular/core';

/**
 * A glass card, with an optional heading and an actions slot. The body is free-form (`<ng-content>`).
 * `eyebrow` renders the heading as a small uppercase label (dashboard cards) instead of a section title.
 */
@Component({
  selector: 'app-panel',
  templateUrl: './panel.html',
})
export class Panel {
  readonly heading = input<string>();
  readonly eyebrow = input(false, { transform: booleanAttribute });
  /** Tighter padding, for a panel that wraps a single row (a leaf in a tree). */
  readonly compact = input(false, { transform: booleanAttribute });
}
