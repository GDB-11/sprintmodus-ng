import { Component, input } from '@angular/core';

/**
 * A visible note explaining why a nearby control is disabled — pair with the control's own `disabled` + `title`
 * (see `app-button`). Unlike `title`, this also works on touch. See CLAUDE.md, "What the user may not do is shown,
 * disabled, with the reason."
 */
@Component({
  selector: 'app-disabled-reason',
  templateUrl: './disabled-reason.html',
})
export class DisabledReason {
  readonly reason = input.required<string>();
}
