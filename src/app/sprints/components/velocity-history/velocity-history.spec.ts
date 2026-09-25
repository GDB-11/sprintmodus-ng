import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VelocityHistory as History } from '../../../projects/models/project.models';
import { sprint } from '../../../projects/projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { VelocityHistory } from './velocity-history';

const HISTORY: History = {
  projectCode: 'p1',
  averageVelocity: 25.5,
  sprints: [
    sprint({ sprintCode: 'a', name: 'Sprint 1', status: 'CLOSED', endDate: '2026-01-19', plannedVelocity: 30, velocity: 20 }),
    sprint({ sprintCode: 'b', name: 'Sprint 2', status: 'CLOSED', endDate: '2026-02-02', plannedVelocity: 30, velocity: 31 }),
  ],
};

describe('VelocityHistory', () => {
  let fixture: ComponentFixture<VelocityHistory>;

  function render(history: History = HISTORY): HTMLElement {
    fixture = TestBed.createComponent(VelocityHistory);
    fixture.componentRef.setInput('history', history);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists the last closed sprints with planned and completed points, and the average', () => {
    const root = render();

    expect(root.textContent!.replace(/\s+/g, ' ')).toContain('Velocidad promedio de los últimos 2 sprints cerrados: 25.5 puntos.');
    const rows = [...root.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].slice(0, 4).map((c) => c.textContent!.trim()));
    expect(rows).toEqual([
      ['Sprint 1', 'Jan 19, 2026', '30', '20'],
      ['Sprint 2', 'Feb 2, 2026', '30', '31'],
    ]);
  });

  it('draws bars that repeat the numbers, scaled to the largest, and hides them from assistive technology', () => {
    const root = render();

    const bars = [...root.querySelectorAll<HTMLElement>('tbody td[aria-hidden="true"] div div')].map((bar) => bar.style.width);
    expect(bars).toEqual(['97%', '65%', '97%', '100%']);
  });

  it('says so when no sprint has been closed yet', () => {
    const root = render({ projectCode: 'p1', sprints: [], averageVelocity: 0 });

    expect(root.textContent).toContain('Aún no hay sprints cerrados');
    expect(root.querySelector('table')).toBeNull();
  });

  it('is free of accessibility violations', async () => {
    await expectNoAxeViolations(render());
  });
});
