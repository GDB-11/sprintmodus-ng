import { Component, computed, input } from '@angular/core';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** A person's initials in a circle. Labelled with their full name for screen readers. */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
})
export class Avatar {
  readonly name = input.required<string>();

  protected readonly initials = computed(() => initialsOf(this.name()));
}
