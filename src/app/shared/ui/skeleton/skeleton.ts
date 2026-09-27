import { Component, input } from '@angular/core';

/** A shimmering loading placeholder block. Honors `prefers-reduced-motion` globally (see styles.css). */
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
}
