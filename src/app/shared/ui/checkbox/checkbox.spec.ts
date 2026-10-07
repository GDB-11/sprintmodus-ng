import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Checkbox } from './checkbox';

@Component({
  imports: [Checkbox, FormField],
  template: `
    <app-checkbox [(checked)]="plain">Registrar la velocidad</app-checkbox>
    <app-checkbox [(checked)]="plain" ariaLabel="Final, fila 1" [disabled]="off()" />
    <app-checkbox [formField]="settings.flag">Con formulario</app-checkbox>
  `,
})
class Host {
  readonly plain = signal(false);
  readonly off = signal(false);
  readonly model = signal({ flag: true });
  readonly settings = form(this.model);
}

describe('Checkbox', () => {
  let fixture: ComponentFixture<Host>;
  const inputs = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('is a native checkbox named by its projected label, or by ariaLabel when it has none', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Registrar la velocidad');
    expect(inputs()[1].getAttribute('aria-label')).toBe('Final, fila 1');
  });

  it('writes the checked state back through two-way binding, and clicking the label toggles it', () => {
    inputs()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.plain()).toBe(true);
    expect(inputs()[1].checked).toBe(true);

    (fixture.nativeElement as HTMLElement).querySelector('label')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.plain()).toBe(false);
  });

  it('is disabled when asked', () => {
    fixture.componentInstance.off.set(true);
    fixture.detectChanges();
    expect(inputs()[1].disabled).toBe(true);
  });

  it('is a Signal Forms control: reads and writes the field', () => {
    expect(inputs()[2].checked).toBe(true);
    inputs()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.model().flag).toBe(false);
  });

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(fixture.nativeElement);
  });
});
