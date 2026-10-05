import { Component } from '@angular/core';

/** The floating "surface" behind a list of choices anchored to a control (a combobox's own results, not a `app-popover`
 * menu, which is CDK-overlay based and needs a real anchor). Position it from the caller with layout utilities only. */
@Component({
  selector: 'app-menu-surface',
  templateUrl: './menu-surface.html',
})
export class MenuSurface {}
