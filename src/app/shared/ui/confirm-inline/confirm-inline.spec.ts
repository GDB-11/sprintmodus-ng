import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ConfirmInline } from './confirm-inline';

describe('ConfirmInline', () => {
  let fixture: ComponentFixture<ConfirmInline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmInline] }).compileComponents();
    fixture = TestBed.createComponent(ConfirmInline);
    fixture.componentRef.setInput('question', '¿Eliminar TASK-1?');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll('button'));

  it('is an inline alertdialog labelled by the question', () => {
    const dialog = root().querySelector('[role="alertdialog"]')!;
    const labelledBy = dialog.getAttribute('aria-labelledby')!;
    expect(document.getElementById(labelledBy)?.textContent).toBe('¿Eliminar TASK-1?');
  });

  it('emits confirm and cancel', () => {
    let confirmed = 0;
    let cancelled = 0;
    fixture.componentInstance.confirm.subscribe(() => confirmed++);
    fixture.componentInstance.cancel.subscribe(() => cancelled++);

    buttons()[0].click();
    buttons()[1].click();

    expect(confirmed).toBe(1);
    expect(cancelled).toBe(1);
  });

  it('disables the confirm button while busy', () => {
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(buttons()[0].disabled).toBe(true);
  });

  it('gives each instance its own id, so several can be on a page at once', async () => {
    const second = TestBed.createComponent(ConfirmInline);
    second.componentRef.setInput('question', '¿Eliminar TASK-2?');
    second.detectChanges();

    const firstId = root().querySelector('[role="alertdialog"]')!.getAttribute('aria-labelledby');
    const secondId = (second.nativeElement as HTMLElement).querySelector('[role="alertdialog"]')!.getAttribute('aria-labelledby');
    expect(firstId).not.toBe(secondId);
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
