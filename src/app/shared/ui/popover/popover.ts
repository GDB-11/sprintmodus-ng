import { A11yModule } from '@angular/cdk/a11y';
import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { Component, input, model } from '@angular/core';

/**
 * A CDK-overlay panel anchored to a trigger the consumer marks with `cdkOverlayOrigin`. Handles focus (trapped and
 * restored), Escape and outside-click; on phone it gets a scrim from the overlay's own backdrop. Two-way bound via
 * `[(open)]`, so the trigger toggles it and this closes itself.
 */
@Component({
  selector: 'app-popover',
  imports: [OverlayModule, A11yModule],
  templateUrl: './popover.html',
})
export class Popover {
  readonly origin = input.required<CdkOverlayOrigin>();
  readonly open = model(false);
  readonly label = input.required<string>();
}
