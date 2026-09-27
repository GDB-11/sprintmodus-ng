import { Component, computed, input } from '@angular/core';
import { ICON_SHAPES, IconName } from './icon-shapes';

export type { IconName } from './icon-shapes';

/**
 * One inline-SVG icon from the shared set (`icon-shapes.ts`). Decorative by default (`aria-hidden`); pass `label` when
 * the icon is the only content of a control (e.g. an icon-only button) so it gets `role="img"` + `aria-label` instead.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
})
export class Icon {
  readonly name = input.required<IconName>();
  /** Set only when the icon carries meaning on its own (nothing else labels the control it's in). */
  readonly label = input<string>();

  protected readonly shapes = computed(() => ICON_SHAPES[this.name()]);
}
