import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartProbe, ChartProbeRole } from './chart-probe';

describe('ChartProbe', () => {
  let fixture: ComponentFixture<ChartProbe>;

  const render = (kind: ChartProbeRole) => {
    fixture = TestBed.createComponent(ChartProbe);
    fixture.componentRef.setInput('kind', kind);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('is hidden from everyone', () => {
    const host = render('grid');
    expect(host.classList).toContain('hidden');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('carries the theme classes of its role', () => {
    expect(render('ink').classList).toContain('text-neutral-800');
    expect(render('grid').classList).toContain('border-neutral-300');
    expect(render('surface').classList).toContain('bg-light-bg');
  });
});
