import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../auth/services/auth.service';
import { FakeBoard, provideFakeBoard } from '../../../board/board.testing';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { environment } from '../../../../environments/environment';
import { WorkItemComments } from './work-item-comments';
import { expectNoAxeViolations } from '../../../testing/axe';

const URL = `${environment.apiUrl}/api/work-items/item-1/comments`;

const comment = (code: string, content: string) => ({
  commentCode: code,
  workItemCode: 'item-1',
  author: { userCode: 'u1', fullName: 'Mia Member' },
  content,
  createdAt: '2026-01-05T10:00:00Z',
});

describe('WorkItemComments', () => {
  let fixture: ComponentFixture<WorkItemComments>;
  let http: HttpTestingController;
  let board: FakeBoard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemComments],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFakeBoard(),
        { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u-me' }) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    board = TestBed.inject(BoardWebSocketService) as unknown as FakeBoard;
    fixture = TestBed.createComponent(WorkItemComments);
    fixture.componentRef.setInput('workItemCode', 'item-1');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;

  async function load(comments: unknown[]): Promise<void> {
    (await vi.waitFor(() => http.expectOne(URL))).flush(comments);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function type(text: string): Promise<void> {
    const textarea = root().querySelector<HTMLTextAreaElement>('#comment-content')!;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit'));

  it('lists the comments in the order the backend returns them', async () => {
    await load([comment('c1', 'First!'), comment('c2', 'Second')]);

    const items = [...root().querySelectorAll('li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Mia Member');
    expect(items[0]).toContain('First!');
    expect(items[1]).toContain('Second');
  });

  it('says so when there are no comments', async () => {
    await load([]);

    expect(root().textContent).toContain('Aún no hay comentarios.');
  });

  it('posts a comment, appends it and clears the box', async () => {
    await load([comment('c1', 'First!')]);
    await type('  Ship it  ');
    submit();

    const request = await vi.waitFor(() => http.expectOne(URL));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ content: 'Ship it' });
    request.flush(comment('c2', 'Ship it'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelectorAll('li')).toHaveLength(2);
    expect(root().querySelectorAll('li')[1].textContent).toContain('Ship it');
    expect(root().querySelector<HTMLTextAreaElement>('#comment-content')!.value).toBe('');
  });

  it('does not post an empty comment', async () => {
    await load([]);
    await type('   ');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(URL);
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Escribe un comentario primero.');
  });

  it('shows why a comment was refused and keeps the text', async () => {
    await load([]);
    await type('Hello');
    submit();

    (await vi.waitFor(() => http.expectOne(URL))).flush(
      { code: 'WORK_ITEM_NOT_FOUND', message: 'That work item no longer exists.' },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().textContent).toContain('That work item no longer exists.');
    expect(root().querySelector<HTMLTextAreaElement>('#comment-content')!.value).toBe('Hello');
  });


  describe('mentions', () => {
    const ANA = '11111111-1111-4111-8111-111111111111';
    const USERS = `${environment.apiUrl}/api/users`;
    const textarea = () => root().querySelector<HTMLTextAreaElement>('#comment-content')!;

    /** Types like a person would: text, caret at its end, the events a browser fires. */
    function write(text: string): void {
      const element = textarea();
      element.focus();
      element.value = text;
      element.setSelectionRange(text.length, text.length);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    }

    async function pickAna(typed = '@an'): Promise<void> {
      write(typed);
      (await vi.waitFor(() => http.expectOne((r) => r.url === USERS))).flush([{ userCode: ANA, fullName: 'Ana Diaz' }]);
      await fixture.whenStable();
      fixture.detectChanges();
      textarea().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('shows the mentions of a comment as highlighted names and never the code', async () => {
      await load([comment('c1', `Please look, @[Ana Diaz](${ANA})`)]);

      const item = root().querySelector('li')!;
      expect(item.textContent).toContain('Please look, @Ana Diaz');
      expect(item.textContent).not.toContain(ANA);
      expect(item.querySelector('span.rounded-sm')?.textContent).toBe('@Ana Diaz');
    });

    it('shows a mention in a comment that arrives live too', async () => {
      await load([]);

      board.commentAdded$.next({ workItemCode: 'item-1', comment: comment('c2', `Hi @[Ana Diaz](${ANA})`) });
      fixture.detectChanges();

      expect(root().querySelector('li')?.textContent).toContain('Hi @Ana Diaz');
      expect(root().querySelector('li')?.textContent).not.toContain(ANA);
    });

    it('hints that @ mentions someone', async () => {
      await load([]);

      expect(root().textContent).toContain('Escribe @ para mencionar a alguien');
    });

    it('offers the people, keeps the text readable and sends the mention as a token', async () => {
      await load([]);
      await pickAna('Hola @an');

      expect(textarea().value).toBe('Hola @Ana Diaz ');
      expect(textarea().value).not.toContain(ANA);

      write(`${textarea().value}mira esto`);
      submit();
      const request = await vi.waitFor(() => http.expectOne(URL));
      expect(request.request.body).toEqual({ content: `Hola @[Ana Diaz](${ANA}) mira esto` });
      request.flush(comment('c2', `Hola @[Ana Diaz](${ANA}) mira esto`));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(root().querySelector('li')?.textContent).toContain('Hola @Ana Diaz mira esto');
      expect(textarea().value).toBe('');
    });

    it('sends a name that was edited after picking, or typed by hand, as plain text', async () => {
      await load([]);
      await pickAna('@an');
      write('@Ana Dia y @Ana Diaz');
      submit();

      const request = await vi.waitFor(() => http.expectOne(URL));
      // the second one is unambiguous (only Ana was picked under that name), the first was edited so it mentions nobody
      expect(request.request.body).toEqual({ content: `@Ana Dia y @[Ana Diaz](${ANA})` });
      request.flush(comment('c2', 'x'));
    });

    it('forgets whom it picked once the comment is posted', async () => {
      await load([]);
      await pickAna('@an');
      submit();
      (await vi.waitFor(() => http.expectOne(URL))).flush(comment('c2', 'x'));
      await fixture.whenStable();
      fixture.detectChanges();

      write('@Ana Diaz otra vez');
      submit();

      const request = await vi.waitFor(() => http.expectOne(URL));
      expect(request.request.body).toEqual({ content: '@Ana Diaz otra vez' });
      request.flush(comment('c3', 'x'));
    });

    it('shows why a mention was refused, and keeps the text', async () => {
      await load([]);
      await pickAna('@an');
      submit();

      (await vi.waitFor(() => http.expectOne(URL))).flush(
        { code: 'UNKNOWN_MENTION', message: 'The user @Ana Diaz does not exist or is no longer active.' },
        { status: 400, statusText: 'Bad Request' },
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(root().textContent).toContain('The user @Ana Diaz does not exist or is no longer active.');
      expect(textarea().value).toBe('@Ana Diaz ');
    });

    it('passes axe with a mention shown and the list open', async () => {
      await load([comment('c1', `Hi @[Ana Diaz](${ANA})`)]);
      write('@an');
      (await vi.waitFor(() => http.expectOne((r) => r.url === USERS))).flush([{ userCode: ANA, fullName: 'Ana Diaz' }]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(root().querySelector('[role="option"]')).not.toBeNull();
      await expectNoAxeViolations(root());
    });
  });

  it('has no accessibility violations', async () => {
    await load([comment('c1', 'First!'), comment('c2', 'Second')]);
    await expectNoAxeViolations(root());

    await type('   ');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });

  describe('live updates', () => {
    const arrived = (code: string, content: string, workItemCode = 'item-1', userCode = 'u-luis') => ({
      workItemCode,
      comment: { ...comment(code, content), workItemCode, author: { userCode, fullName: 'Luis Lopez' } },
    });
    const items = () => [...root().querySelectorAll('li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    // the first status line that says something (the mention field keeps an empty one for its own announcements)
    const status = () =>
      [...root().querySelectorAll('p[role="status"]')].map((line) => line.textContent?.replace(/\s+/g, ' ').trim()).find((text) => text);

    afterEach(() => vi.useRealTimers());

    it("shows a comment somebody else posts as it arrives, and ignores other items' comments", async () => {
      await load([comment('c1', 'First!')]);

      board.commentAdded$.next(arrived('c2', 'From Luis'));
      board.commentAdded$.next(arrived('c3', 'Elsewhere', 'item-2'));
      fixture.detectChanges();

      expect(items()).toHaveLength(2);
      expect(items()[1]).toContain('From Luis');
    });

    it('does not list a comment twice when the one this user posted comes back as a broadcast', async () => {
      await load([]);
      await type('Mine');
      submit();
      (await vi.waitFor(() => http.expectOne(URL))).flush(comment('c9', 'Mine'));
      await fixture.whenStable();

      board.commentAdded$.next(arrived('c9', 'Mine', 'item-1', 'u-me'));
      fixture.detectChanges();

      expect(items()).toHaveLength(1);
    });

    it('reloads the comments when the board asks for it', async () => {
      await load([comment('c1', 'First!')]);

      board.refresh$.next();

      (await vi.waitFor(() => http.expectOne(URL))).flush([comment('c1', 'First!'), comment('c2', 'Missed meanwhile')]);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(items()).toHaveLength(2);
    });

    it('says who is typing, for a few seconds, and not about this user', async () => {
      await load([]);
      vi.useFakeTimers();

      board.userTyping$.next({ workItemCode: 'item-1', user: { userCode: 'u-luis', email: 'luis@acme.io' } });
      board.userTyping$.next({ workItemCode: 'item-1', user: { userCode: 'u-me', email: 'me@acme.io' } });
      board.userTyping$.next({ workItemCode: 'item-2', user: { userCode: 'u-ana', email: 'ana@acme.io' } });
      fixture.detectChanges();
      expect(status()).toBe('luis@acme.io está escribiendo…');

      board.userTyping$.next({ workItemCode: 'item-1', user: { userCode: 'u-ana', email: 'ana@acme.io' } });
      fixture.detectChanges();
      expect(status()).toBe('luis@acme.io, ana@acme.io están escribiendo…');

      vi.advanceTimersByTime(4000);
      fixture.detectChanges();
      expect(status()).toBeUndefined();
    });

    it('stops saying someone is typing once their comment arrives', async () => {
      await load([]);
      board.userTyping$.next({ workItemCode: 'item-1', user: { userCode: 'u-luis', email: 'luis@acme.io' } });
      fixture.detectChanges();

      board.commentAdded$.next(arrived('c2', 'Done typing'));
      fixture.detectChanges();

      expect(status()).toBeUndefined();
    });

    it('tells the board this user is typing, at most every couple of seconds', async () => {
      await load([]);
      vi.useFakeTimers();
      const textarea = root().querySelector<HTMLTextAreaElement>('#comment-content')!;

      for (let i = 0; i < 5; i++) {
        textarea.value += 'a';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      expect(board.notifyTyping).toHaveBeenCalledTimes(1);
      expect(board.notifyTyping).toHaveBeenCalledWith('item-1');

      vi.advanceTimersByTime(2100);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      expect(board.notifyTyping).toHaveBeenCalledTimes(2);
    });
  });
});
