import { Component, input } from '@angular/core';

/** A glass card, with an optional heading and an actions slot. The body is free-form (`<ng-content>`). */
@Component({
  selector: 'app-panel',
  templateUrl: './panel.html',
})
export class Panel {
  readonly heading = input<string>();
}
