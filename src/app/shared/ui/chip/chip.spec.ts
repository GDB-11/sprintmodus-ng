import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Chip, ChipTone } from './chip';

@Component({
  imports: [Chip],
  template: `<app-chip [tone]="tone()">Crítica</app-chip>`,
})
class Host {
  readonly tone = signal<ChipTone>('error');
}

describe('Chip', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('renders its text', () => {
    expect(root().textContent?.trim()).toBe('Crítica');
  });

  it('switches classes with tone', () => {
    for (const tone of ['neutral', 'error', 'warning', 'info', 'success'] as const) {
      fixture.componentInstance.tone.set(tone);
      fixture.detectChanges();
      expect(root().querySelector('span')?.className).toContain(tone === 'neutral' ? 'neutral-200' : `${tone}-100`);
    }
  });

  it('passes axe for every tone', async () => {
    for (const tone of ['neutral', 'error', 'warning', 'info', 'success'] as const) {
      fixture.componentInstance.tone.set(tone);
      fixture.detectChanges();
      await expectNoAxeViolations(root());
    }
  });
});
