import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { chooseOption, openOptions, openOptionTexts, selectedText, selectTrigger } from '../../../testing/select-menu';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SelectMenuOption } from '../select-menu/select-option';
import { SearchableSelect } from './searchable-select';

const OPTIONS: SelectMenuOption[] = [
  { value: 'u1', label: 'Ana Díaz', hint: 'QA' },
  { value: 'u2', label: 'Luis López', hint: 'DEV' },
  { value: 'u3', label: 'Marta Pérez', hint: 'DEV' },
  { value: 'u4', label: 'Pedro Gómez', disabled: true },
];

@Component({
  imports: [SearchableSelect, FormField],
  template: `
    <app-searchable-select label="Persona" [options]="options" [(value)]="chosen" />
    <app-searchable-select label="Formulario" [options]="options" [formField]="settings.person" />
  `,
})
class Host {
  readonly options = OPTIONS;
  readonly chosen = signal('');
  readonly model = signal({ person: 'u2' });
  readonly settings = form(this.model);
}

describe('SearchableSelect', () => {
  let fixture: ComponentFixture<Host>;
  const detect = () => fixture.detectChanges();
  const root = () => fixture.nativeElement as HTMLElement;
  const search = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')!;

  function type(text: string): void {
    search().value = text;
    search().dispatchEvent(new Event('input'));
    detect();
  }
  function key(name: string): void {
    search().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    detect();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    detect();
  });

  it('shows the placeholder until something is chosen', () => {
    expect(selectedText(selectTrigger(root(), 'Persona'))).toBe('Seleccionar');
    expect(selectedText(selectTrigger(root(), 'Formulario'))).toBe('Luis López DEV');
  });

  it('opens a panel with a search box above every option', () => {
    selectTrigger(root(), 'Persona').click();
    detect();

    expect(search()).not.toBeNull();
    expect(openOptionTexts()).toEqual(['Ana Díaz QA', 'Luis López DEV', 'Marta Pérez DEV', 'Pedro Gómez']);
  });

  it('filters as you type, ignoring case and accents, and also by the hint', () => {
    selectTrigger(root(), 'Persona').click();
    detect();

    type('diaz');
    expect(openOptionTexts()).toEqual(['Ana Díaz QA']);
    type('dev');
    expect(openOptionTexts()).toEqual(['Luis López DEV', 'Marta Pérez DEV']);
    type('zzz');
    expect(openOptionTexts()).toEqual([]);
    expect(document.body.textContent).toContain('Ningún resultado.');
  });

  it('chooses the active match with the keyboard and closes', () => {
    selectTrigger(root(), 'Persona').click();
    detect();

    type('dev');
    key('ArrowDown');
    key('Enter');

    expect(fixture.componentInstance.chosen()).toBe('u3');
    expect(openOptions()).toHaveLength(0);
    expect(selectedText(selectTrigger(root(), 'Persona'))).toBe('Marta Pérez DEV');
  });

  it('closes on Escape without changing the value', () => {
    selectTrigger(root(), 'Persona').click();
    detect();

    key('Escape');

    expect(openOptions()).toHaveLength(0);
    expect(fixture.componentInstance.chosen()).toBe('');
  });

  it('chooses by click, and does not choose a disabled option', () => {
    selectTrigger(root(), 'Persona').click();
    detect();
    openOptions()[3].click();
    detect();
    expect(fixture.componentInstance.chosen()).toBe('');

    openOptions()[0].click();
    detect();
    expect(fixture.componentInstance.chosen()).toBe('u1');
  });

  it('starts every opening with an empty search', () => {
    const trigger = selectTrigger(root(), 'Persona');
    trigger.click();
    detect();
    type('ana');
    key('Escape');

    trigger.click();
    detect();

    expect(search().value).toBe('');
    expect(openOptions()).toHaveLength(4);
  });

  it('is a Signal Forms control: reads and writes the field', () => {
    chooseOption(selectTrigger(root(), 'Formulario'), 'Ana', detect);

    expect(fixture.componentInstance.model().person).toBe('u1');
  });

  it('has no accessibility violations, closed and open', async () => {
    await expectNoAxeViolations(root());
    selectTrigger(root(), 'Persona').click();
    detect();
    await expectNoAxeViolations(document.body);
  });
});
