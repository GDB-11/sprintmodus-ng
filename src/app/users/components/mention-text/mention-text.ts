import { Component, computed, input } from '@angular/core';
import { parseMentionText } from '../../models/mention-text';

/** A comment's text with its mentions highlighted as `@Full Name`. Text is only ever interpolated, never inserted as markup. */
@Component({
  selector: 'app-mention-text',
  templateUrl: './mention-text.html',
})
export class MentionText {
  readonly content = input.required<string>();

  protected readonly segments = computed(() => parseMentionText(this.content()));
}
