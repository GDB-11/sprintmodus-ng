import { Component, input } from '@angular/core';

/**
 * Sprintmodus mark + wordmark (derived: the mock only shows a gradient placeholder square). `markOnly` renders just
 * the mark, for tight spaces like the collapsed sidebar rail.
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.html',
})
export class Logo {
  readonly markOnly = input(false);
}
