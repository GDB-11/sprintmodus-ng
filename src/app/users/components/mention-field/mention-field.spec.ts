import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, required } from '@angular/forms/signals';
import { signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { expectNoAxeViolations } from '../../../testing/axe';
import { UserRef } from '../../../work-items/models/work-item.models';
import { MentionField } from './mention-field';

const URL = `${environment.apiUrl}/api/users`;
const ANA: UserRef = { userCode: 'u-ana', fullName: 'Ana Diaz' };
const ANIBAL: UserRef = { userCode: 'u-anibal', fullName: 'Aníbal Ruiz' };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('MentionField', () => {
  let fixture: ComponentFixture<MentionField>;
  let http: HttpTestingController;
  let model: ReturnType<typeof signal<{ content: string }>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionField],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    model = signal({ content: '' });
    const comment = TestBed.runInInjectionContext(() => form(model, (path) => required(path.content, { message: 'Escribe algo.' })));
    fixture = TestBed.createComponent(MentionField);
    fixture.componentRef.setInput('field', comment.content);
    fixture.componentRef.setInput('inputId', 'text');
    fixture.componentRef.setInput('label', 'Comentario');
    fixture.componentRef.setInput('hint', 'Escribe @ para mencionar a alguien.');
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const textarea = () => root().querySelector<HTMLTextAreaElement>('textarea')!;
  const options = () => [...root().querySelectorAll<HTMLElement>('[role="option"]')];
  const status = () => root().querySelector('p[role="status"]')!.textContent!.trim();

  /** Types like a person: sets the text, puts the caret at its end and fires the events a browser would. */
  function type(text: string): void {
    const element = textarea();
    element.focus();
    element.value = text;
    element.setSelectionRange(text.length, text.length);
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** Waits for the search the pause in the typing lets go, and answers it. */
  async function answer(users: UserRef[], query?: string): Promise<void> {
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === URL));
    if (query !== undefined) {
      expect(request.request.params.get('q')).toBe(query);
    }
    request.flush(users);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    textarea().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  it('asks for nothing until an @ is typed', async () => {
    type('Hola a todos');
    await wait(500);

    http.expectNone(URL);
    expect(options()).toEqual([]);
  });

  it('offers the people whose name starts with what follows the @, after a short pause', async () => {
    type('Hola @an');
    http.expectNone(URL); // still waiting for a pause in the typing
    await answer([ANA, ANIBAL], 'an');

    expect(options().map((option) => option.textContent?.trim())).toEqual(['Ana Diaz', 'Aníbal Ruiz']);
    expect(root().querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('Personas a las que mencionar');
  });

  it('searches once for a burst of typing, with the last text', async () => {
    type('@a');
    await wait(100);
    type('@an');
    await wait(100);
    type('@ana');

    await answer([ANA], 'ana');
  });

  it('is a textbox that owns a popup: focus stays in the text while the highlighted person is pointed at', async () => {
    expect(textarea().getAttribute('aria-haspopup')).toBe('listbox');
    expect(textarea().getAttribute('aria-autocomplete')).toBe('list');
    expect(textarea().hasAttribute('aria-controls')).toBe(false);
    expect(textarea().hasAttribute('aria-activedescendant')).toBe(false);
    expect(textarea().getAttribute('role')).toBeNull();

    type('@an');
    await answer([ANA, ANIBAL]);

    const listbox = root().querySelector('[role="listbox"]')!;
    expect(textarea().getAttribute('aria-controls')).toBe(listbox.id);
    expect(textarea().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    expect(options().map((option) => option.getAttribute('aria-selected'))).toEqual(['true', 'false']);

    press('ArrowDown');
    expect(textarea().getAttribute('aria-activedescendant')).toBe(options()[1].id);
    expect(options().map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(document.activeElement).toBe(textarea());
  });

  it('moves with the arrow keys, wrapping round, without moving the caret', async () => {
    type('@an');
    await answer([ANA, ANIBAL]);

    const down = press('ArrowDown');
    press('ArrowDown');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    press('ArrowUp');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
    expect(down.defaultPrevented).toBe(true);
  });

  it('inserts @Full Name on Enter, reports whom it was, and puts the caret after it', async () => {
    type('Hola @an');
    await answer([ANA, ANIBAL]);
    press('ArrowDown');

    const enter = press('Enter');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(enter.defaultPrevented).toBe(true);
    expect(model().content).toBe('Hola @Aníbal Ruiz ');
    expect(textarea().value).toBe('Hola @Aníbal Ruiz ');
    expect(textarea().selectionStart).toBe('Hola @Aníbal Ruiz '.length);
    expect(fixture.componentInstance.mentions()).toEqual([{ userCode: 'u-anibal', fullName: 'Aníbal Ruiz' }]);
    expect(options()).toEqual([]);
    expect(status()).toBe('Se mencionó a Aníbal Ruiz.');
    expect(document.activeElement).toBe(textarea());
  });

  it('inserts with a click, without taking focus from the text', async () => {
    type('@an');
    await answer([ANA]);

    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[0].dispatchEvent(mousedown);
    options()[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mousedown.defaultPrevented).toBe(true);
    expect(model().content).toBe('@Ana Diaz ');
    expect(fixture.componentInstance.mentions()).toEqual([{ userCode: 'u-ana', fullName: 'Ana Diaz' }]);
  });

  it('closes on Escape and stays away until another @ is typed', async () => {
    type('@an');
    await answer([ANA]);

    const escape = press('Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(options()).toEqual([]);

    type('@ana');
    await wait(500);
    http.expectNone(URL);
    expect(options()).toEqual([]);

    type('@ana y @ca');
    await answer([], 'ca');
  });

  it('does not stay open after a pick while the person keeps writing', async () => {
    type('@an');
    await answer([ANA]);
    press('Enter');
    await fixture.whenStable();

    type('@Ana Diaz gracias por todo');
    await wait(500);

    http.expectNone(URL);
    expect(options()).toEqual([]);
  });

  it('leaves Enter and the arrow keys alone when nothing is offered', async () => {
    type('@zz');
    await answer([]);

    expect(press('Enter').defaultPrevented).toBe(false);
    expect(press('ArrowDown').defaultPrevented).toBe(false);
    expect(status()).toBe('No hay personas que coincidan.');
  });

  it('says how many people were found, and that a search failed', async () => {
    type('@an');
    await answer([ANA, ANIBAL]);
    expect(status()).toContain('2 personas');

    type('@ana');
    (await vi.waitFor(() => http.expectOne((r) => r.url === URL))).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(status()).toBe('No se pudo buscar personas.');
    expect(options()).toEqual([]);
  });

  it('closes when the text loses focus and does not react to an e-mail address', async () => {
    type('@an');
    await answer([ANA]);
    textarea().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(options()).toEqual([]);

    type('escríbeme a ana@correo.com');
    await wait(500);
    http.expectNone(URL);
  });

  it('keeps the label, the hint and the validation message of every other field', async () => {
    expect(root().querySelector('label')?.textContent).toBe('Comentario');
    expect(root().textContent).toContain('Escribe @ para mencionar a alguien.');
    expect(textarea().getAttribute('aria-describedby')).toBe('text-hint');

    textarea().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toBe('Escribe algo.');
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    expect(textarea().getAttribute('aria-describedby')).toBe('text-hint text-error');
  });

  it('passes axe closed and open', async () => {
    await expectNoAxeViolations(root());

    type('@an');
    await answer([ANA, ANIBAL]);
    expect(options()).toHaveLength(2);

    await expectNoAxeViolations(root());
  });
});
