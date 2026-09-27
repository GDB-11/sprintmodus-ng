import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SegmentedControl } from './segmented-control';

describe('SegmentedControl', () => {
  let fixture: ComponentFixture<SegmentedControl<string>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SegmentedControl] }).compileComponents();
    fixture = TestBed.createComponent(SegmentedControl<string>);
    fixture.componentRef.setInput('options', [
      { value: 'tree', label: 'Árbol' },
      { value: 'overview', label: 'Vista general' },
      { value: 'list', label: 'Lista' },
    ]);
    fixture.componentRef.setInput('value', 'tree');
    fixture.componentRef.setInput('groupLabel', 'Vista de elementos de trabajo');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll('button'));

  it('is a labelled group of toggle buttons', () => {
    expect(root().querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Vista de elementos de trabajo');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Árbol', 'Vista general', 'Lista']);
  });

  it('marks the selected option pressed and updates the value model on click', () => {
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('false');

    buttons()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('overview');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
