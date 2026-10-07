import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { BarChart } from './bar-chart';

describe('BarChart', () => {
  let fixture: ComponentFixture<BarChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BarChart] }).compileComponents();
    fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('groups', [
      { label: 'S1', values: [30, 20] },
      { label: 'S2', values: [30, 15] },
    ]);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('scales every bar to the largest value and labels each group', () => {
    const heights = [...root().querySelectorAll<HTMLElement>('.rounded-t-md')].map((bar) => bar.style.height);
    expect(heights).toEqual(['100%', '67%', '100%', '50%']);
    expect(root().textContent).toContain('S1');
    expect(root().textContent).toContain('S2');
  });

  it('is hidden from assistive technology, since its numbers are repeated elsewhere', () => {
    expect(root().firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(root());
  });
});
