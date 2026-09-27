import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { FilterChip } from './filter-chip';

@Component({
  imports: [FilterChip],
  template: `<button appFilterChip type="button" [pressed]="pressed()">Alta</button>`,
})
class Host {
  readonly pressed = signal(false);
}

describe('FilterChip', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const button = () => root().querySelector('button')!;

  it('reflects pressed state via aria-pressed (never colour alone)', () => {
    expect(button().getAttribute('aria-pressed')).toBe('false');

    fixture.componentInstance.pressed.set(true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().className).toContain('bg-secondary-900');
  });

  it('passes axe pressed and unpressed', async () => {
    await expectNoAxeViolations(root());
    fixture.componentInstance.pressed.set(true);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
