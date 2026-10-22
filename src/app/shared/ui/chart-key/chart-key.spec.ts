import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ChartKey, ChartKeyKind } from './chart-key';

describe('ChartKey', () => {
  let fixture: ComponentFixture<ChartKey>;

  const render = (kind: ChartKeyKind) => {
    fixture = TestBed.createComponent(ChartKey);
    fixture.componentRef.setInput('kind', kind);
    fixture.detectChanges();
  };
  const root = () => fixture.nativeElement as HTMLElement;

  it('is decorative', () => {
    render('ideal');
    expect(root().getAttribute('aria-hidden')).toBe('true');
  });

  it('tells the lines apart by pattern, not colour alone', () => {
    render('ideal');
    expect(root().querySelector('line')?.getAttribute('stroke-dasharray')).toBe('6 4');
    render('actual');
    expect(root().querySelector('line')?.getAttribute('stroke-dasharray')).toBeNull();
    expect(root().querySelector('circle')).not.toBeNull();
    render('projection');
    expect(root().querySelector('line')?.getAttribute('stroke-dasharray')).toBe('2 4');
  });

  it('carries the theme colour on its host', () => {
    render('actual');
    expect(root().classList).toContain('text-error-700');
  });

  it('passes axe', async () => {
    render('actual');
    await expectNoAxeViolations(root());
  });
});
