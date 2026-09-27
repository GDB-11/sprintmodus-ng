import { Component, computed, input } from '@angular/core';

/** A small decorative count pill (e.g. an unread count on a nav item). The consumer supplies the accessible number elsewhere (`aria-label`) — this is `aria-hidden`. */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
})
export class Badge {
  readonly count = input.required<number>();
  readonly cap = input(99);

  protected readonly display = computed(() => (this.count() > this.cap() ? `${this.cap()}+` : `${this.count()}`));
}
