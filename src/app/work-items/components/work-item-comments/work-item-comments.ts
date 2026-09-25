import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormRoot, maxLength, required } from '@angular/forms/signals';
import { filter, firstValueFrom, Subject, throttleTime } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { OnlineUser } from '../../../board/models/board.models';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { notBlank } from '../../../shared/not-blank';
import { valueOf } from '../../../shared/resource-value';
import { TextareaField } from '../../../shared/ui/textarea-field/textarea-field';
import { WorkItemComment } from '../../models/work-item.models';
import { CommentService } from '../../services/comment.service';

const MAX_COMMENT_LENGTH = 10000;
/** At most one "I am typing" notice this often; the server also drops repeats. */
const TYPING_NOTICE_MS = 2000;
/** "Someone is typing" goes away this long after their last notice. */
const TYPING_SHOWN_MS = 3500;

/**
 * The comments of a work item, oldest first, and a form to add one. Comments cannot be edited or deleted. Comments other
 * people add appear as they are posted, and it says who is typing one, while the project's live board is connected.
 */
@Component({
  selector: 'app-work-item-comments',
  imports: [DatePipe, FormRoot, TextareaField],
  templateUrl: './work-item-comments.html',
})
export class WorkItemComments {
  private readonly commentService = inject(CommentService);
  private readonly board = inject(BoardWebSocketService);
  private readonly auth = inject(AuthService);

  readonly workItemCode = input.required<string>();

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly comments = rxResource({
    params: () => this.workItemCode(),
    stream: ({ params }) => this.commentService.list(params),
  });

  protected readonly loadedComments = computed(() => valueOf(this.comments) ?? []);

  /** Who is typing right now, by user code, mapped to what to call them. */
  private readonly typing = signal<Readonly<Record<string, string>>>({});
  private readonly typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly typingNotices = new Subject<void>();

  protected readonly typingNow = computed(() => Object.values(this.typing()));

  private readonly model = signal({ content: '' });

  protected readonly commentForm = form(
    this.model,
    (path) => {
      required(path.content, { message: 'Escribe un comentario primero.' });
      notBlank(path.content, 'Escribe un comentario primero.');
      maxLength(path.content, MAX_COMMENT_LENGTH, {
        message: `Usa como máximo ${MAX_COMMENT_LENGTH} caracteres.`,
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
            this.append(added);
            this.model.set({ content: '' });
            this.commentForm().reset();
          } catch (error) {
            this.errorMessage.set(apiErrorMessage(error, 'No se pudo publicar el comentario.'));
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    const forThisItem = <T extends { workItemCode: string }>(event: T) => event.workItemCode === this.workItemCode();

    this.board.commentAdded$.pipe(filter(forThisItem), takeUntilDestroyed()).subscribe(({ comment }) => {
      this.append(comment);
      if (comment.author) {
        this.stopTyping(comment.author.userCode);
      }
    });
    this.board.userTyping$
      .pipe(
        filter(forThisItem),
        filter(({ user }) => user.userCode !== this.auth.getCurrentUser()?.id),
        takeUntilDestroyed(),
      )
      .subscribe(({ user }) => this.showTyping(user));
    this.board.refresh$.pipe(takeUntilDestroyed()).subscribe(() => this.comments.reload());
    this.typingNotices
      .pipe(throttleTime(TYPING_NOTICE_MS), takeUntilDestroyed())
      .subscribe(() => this.board.notifyTyping(this.workItemCode()));
    inject(DestroyRef).onDestroy(() => this.typingTimers.forEach((timer) => clearTimeout(timer)));
  }

  protected onTyping(): void {
    this.typingNotices.next();
  }

  /** Adds a comment unless it is already listed: the one this user posts comes back as a broadcast too. */
  private append(comment: WorkItemComment): void {
    this.comments.update((comments) =>
      (comments ?? []).some((known) => known.commentCode === comment.commentCode) ? comments : [...(comments ?? []), comment],
    );
  }

  private showTyping(user: OnlineUser): void {
    clearTimeout(this.typingTimers.get(user.userCode));
    this.typing.update((typing) => ({ ...typing, [user.userCode]: user.email }));
    this.typingTimers.set(user.userCode, setTimeout(() => this.stopTyping(user.userCode), TYPING_SHOWN_MS));
  }

  private stopTyping(userCode: string): void {
    clearTimeout(this.typingTimers.get(userCode));
    this.typingTimers.delete(userCode);
    this.typing.update(({ [userCode]: _gone, ...others }) => others);
  }
}
