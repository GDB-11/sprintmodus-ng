import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemComments],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
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

    expect(root().textContent).toContain('No comments yet.');
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
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Write a comment first.');
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


  it('has no accessibility violations', async () => {
    await load([comment('c1', 'First!'), comment('c2', 'Second')]);
    await expectNoAxeViolations(root());

    await type('   ');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
