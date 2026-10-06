import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { LineSparkline } from './line-sparkline';

describe('LineSparkline', () => {
  let fixture: ComponentFixture<LineSparkline>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LineSparkline);
    fixture.componentRef.setInput('ideal', [10, 5, 0]);
    fixture.componentRef.setInput('actual', [10, 8, null]);
    fixture.componentRef.setInput('label', 'Quedan 8 h de 10 h');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('draws both lines, and stops the actual one at the last recorded day', () => {
    const paths = root().querySelectorAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[1].getAttribute('d')).toBe('M4,4 L120,13.6');
    expect(root().querySelector('circle')?.getAttribute('cx')).toBe('120');
  });

  it('is named for screen readers', () => {
    expect(root().querySelector('svg')?.getAttribute('aria-label')).toBe('Quedan 8 h de 10 h');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
