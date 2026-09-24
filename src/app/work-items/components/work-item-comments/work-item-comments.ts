import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormRoot, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../shared/http-errors';
import { notBlank } from '../../../shared/not-blank';
import { valueOf } from '../../../shared/resource-value';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';
import { CommentService } from '../../services/comment.service';

const MAX_COMMENT_LENGTH = 10000;

/** The comments of a work item, oldest first, and a form to add one. Comments cannot be edited or deleted. */
@Component({
  selector: 'app-work-item-comments',
  imports: [DatePipe, FormRoot, TextareaField],
  templateUrl: './work-item-comments.html',
})
export class WorkItemComments {
  private readonly commentService = inject(CommentService);

  readonly workItemCode = input.required<string>();

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly comments = rxResource({
    params: () => this.workItemCode(),
    stream: ({ params }) => this.commentService.list(params),
  });

  protected readonly loadedComments = computed(() => valueOf(this.comments) ?? []);

  private readonly model = signal({ content: '' });

  protected readonly commentForm = form(
    this.model,
    (path) => {
      required(path.content, { message: 'Write a comment first.' });
      notBlank(path.content, 'Write a comment first.');
      maxLength(path.content, MAX_COMMENT_LENGTH, {
        message: `Use at most ${MAX_COMMENT_LENGTH} characters.`,
      });
    },
    {
      submission: {
        action: async () => {
          this.errorMessage.set(null);
          try {
            const added = await firstValueFrom(
              this.commentService.add(this.workItemCode(), this.model().content.trim()),
            );
            this.comments.update((comments) => [...(comments ?? []), added]);
            this.model.set({ content: '' });
            this.commentForm().reset();
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'The comment could not be posted.'));
          }
          return undefined;
        },
      },
    },
  );
}
