import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  let fixture: ComponentFixture<ErrorState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ErrorState] }).compileComponents();
    fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('message', 'No se pudo cargar la lista.');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('interrupts (role=alert) with the message', () => {
    const alert = root().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudo cargar la lista.');
  });

  it('emits retry on the button', () => {
    let emitted = 0;
    fixture.componentInstance.retry.subscribe(() => emitted++);
    root().querySelector('button')!.click();
    expect(emitted).toBe(1);
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
