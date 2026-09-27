import { Component, computed, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';

/** Up to `max` avatars overlapping, then a "+N" overflow pill. */
@Component({
  selector: 'app-avatar-group',
  imports: [Avatar],
  templateUrl: './avatar-group.html',
})
export class AvatarGroup {
  readonly names = input.required<readonly string[]>();
  readonly max = input(4);

  protected readonly visible = computed(() => this.names().slice(0, this.max()));
  protected readonly overflow = computed(() => Math.max(0, this.names().length - this.max()));
}
