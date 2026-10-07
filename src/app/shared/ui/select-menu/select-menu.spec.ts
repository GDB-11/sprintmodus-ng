import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { chooseOption, openOptions, openOptionTexts, selectedText, selectTrigger } from '../../../testing/select-menu';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SelectMenu, SelectMenuOption } from './select-menu';

const OPTIONS: SelectMenuOption[] = [
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Beta', hint: 'B' },
  { value: 'c', label: 'Gamma', disabled: true, hint: 'requiere rol' },
  { value: 'd', label: 'Delta' },
];

@Component({
  imports: [SelectMenu, FormField],
  template: `
    <app-select-menu label="Letra" [options]="options" [(value)]="chosen" [disabled]="off()" />
    <app-select-menu label="Acción" [options]="options" [action]="true" (valueChange)="actions.push($event)" />
    <app-select-menu label="Formulario" [options]="options" [formField]="settings.letter" />
  `,
})
class Host {
  readonly options = OPTIONS;
  readonly chosen = signal('b');
  readonly off = signal(false);
  readonly actions: string[] = [];
  readonly model = signal({ letter: 'a' });
  readonly settings = form(this.model);
}

describe('SelectMenu', () => {
  let fixture: ComponentFixture<Host>;
  const detect = () => fixture.detectChanges();
  const root = () => fixture.nativeElement as HTMLElement;
  const key = (trigger: HTMLElement, name: string) => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    detect();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    detect();
  });

  it('shows the chosen option on its trigger, named by its label and value', () => {
    const trigger = selectTrigger(root(), 'Letra');
    expect(selectedText(trigger)).toBe('Beta B');
    expect(trigger.getAttribute('aria-label')).toBe('Letra: Beta');
  });

  it('opens a themed list (not the browser one) with every option, marking the chosen one', () => {
    selectTrigger(root(), 'Letra').click();
    detect();

    expect(openOptionTexts()).toEqual(['Alfa', 'Beta B', 'Gamma requiere rol', 'Delta']);
    expect(openOptions()[1].getAttribute('aria-selected')).toBe('true');
    expect(selectTrigger(root(), 'Letra').getAttribute('aria-expanded')).toBe('true');
  });

  it('chooses by click, closes, and writes the value back', () => {
    chooseOption(selectTrigger(root(), 'Letra'), 'Delta', detect);

    expect(fixture.componentInstance.chosen()).toBe('d');
    expect(openOptions()).toHaveLength(0);
  });

  it('shows options that cannot be chosen, and ignores a click on one', () => {
    selectTrigger(root(), 'Letra').click();
    detect();
    expect(openOptions()[2].getAttribute('aria-disabled')).toBe('true');

    openOptions()[2].click();
    detect();

    expect(fixture.componentInstance.chosen()).toBe('b');
  });

  it('is driven from the keyboard, skipping the options that cannot be chosen', () => {
    const trigger = selectTrigger(root(), 'Letra');
    key(trigger, 'ArrowDown'); // opens on Beta
    key(trigger, 'ArrowDown'); // Gamma is disabled: lands on Delta
    key(trigger, 'Enter');

    expect(fixture.componentInstance.chosen()).toBe('d');
    key(trigger, 'ArrowDown');
    key(trigger, 'Escape');
    expect(openOptions()).toHaveLength(0);
    expect(fixture.componentInstance.chosen()).toBe('d');
  });

  it('jumps to an option by its first letter', () => {
    const trigger = selectTrigger(root(), 'Letra');
    key(trigger, 'g'); // Gamma is disabled, so the jump skips it and finds nothing else with g
    key(trigger, 'a');
    key(trigger, 'Enter');

    expect(fixture.componentInstance.chosen()).toBe('a');
  });

  it('does not open when disabled', () => {
    fixture.componentInstance.off.set(true);
    detect();
    const trigger = selectTrigger(root(), 'Letra');

    expect(trigger.disabled).toBe(true);
    trigger.click();
    detect();
    expect(openOptions()).toHaveLength(0);
  });

  it('in action mode reports the choice and goes back to its placeholder', () => {
    const trigger = selectTrigger(root(), 'Acción');
    chooseOption(trigger, 'Alfa', detect);

    expect(fixture.componentInstance.actions).toEqual(['a', '']);
    expect(selectedText(trigger)).toBe('Seleccionar');
  });

  it('is a Signal Forms control: reads and writes the field', () => {
    const trigger = selectTrigger(root(), 'Formulario');
    expect(selectedText(trigger)).toBe('Alfa');

    chooseOption(trigger, 'Delta', detect);

    expect(fixture.componentInstance.model().letter).toBe('d');
  });

  it('has no accessibility violations, closed and open', async () => {
    await expectNoAxeViolations(root());
    selectTrigger(root(), 'Letra').click();
    detect();
    await expectNoAxeViolations(document.body);
  });
});
