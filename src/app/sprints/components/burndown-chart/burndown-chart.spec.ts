import { ChartConfiguration } from 'chart.js';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { burndown } from '../../../projects/projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ACTUAL_LABEL, IDEAL_LABEL, PROJECTION_LABEL } from '../../models/burndown-chart-config';
import { BurndownChart, CHART_FACTORY, ChartHandle } from './burndown-chart';

class FakeChart implements ChartHandle {
  readonly configs: ChartConfiguration<'line'>[] = [];
  destroyed = false;
  update(config: ChartConfiguration<'line'>): void {
    this.configs.push(config);
  }
  destroy(): void {
    this.destroyed = true;
  }
}

describe('BurndownChart', () => {
  let fixture: ComponentFixture<BurndownChart>;
  let chart: FakeChart;
  let canvas: HTMLCanvasElement | null;

  beforeEach(() => {
    chart = new FakeChart();
    canvas = null;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CHART_FACTORY,
          useValue: (element: HTMLCanvasElement) => {
            canvas = element;
            return chart;
          },
        },
      ],
    });
  });

  afterEach(() => document.documentElement.classList.remove('dark'));

  async function render(data = burndown(10, 40, [36, 30])): Promise<void> {
    fixture = TestBed.createComponent(BurndownChart);
    fixture.componentRef.setInput('burndown', data);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const labels = (config: ChartConfiguration<'line'>) => config.data.datasets.map((d) => d.label);

  it('draws the ideal line and the real hours on a canvas that has a description for assistive technology', async () => {
    await render();

    expect(canvas).toBe(root().querySelector('canvas'));
    expect(labels(chart.configs.at(-1)!)).toEqual([IDEAL_LABEL, ACTUAL_LABEL, PROJECTION_LABEL]);
    const image = root().querySelector('canvas')!;
    expect(image.getAttribute('role')).toBe('img');
    expect(image.getAttribute('aria-label')).toBe(
      'Burndown de Sprint 1: 40 horas al empezar; el día 2 quedan 30 horas frente a 32 de la línea ideal.',
    );
  });

  it('has a legend with a key for every line: the picture never relies on colour alone', async () => {
    await render();

    const keys = [...root().querySelectorAll('ul[aria-label="Leyenda del gráfico"] li')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(keys).toEqual([
      expect.stringContaining('Ideal: el ritmo recto'),
      expect.stringContaining('Real: horas pendientes al final de cada día'),
      expect.stringContaining('Proyección: hacia dónde lleva el ritmo actual'),
    ]);
    expect(root().querySelectorAll('ul[aria-label="Leyenda del gráfico"] svg[aria-hidden="true"]')).toHaveLength(3);
  });

  it('leaves the projection out of the legend and the chart when there is nothing to project', async () => {
    await render(burndown(10, 40, [20, 0]));

    expect(labels(chart.configs.at(-1)!)).toEqual([IDEAL_LABEL, ACTUAL_LABEL]);
    expect(root().querySelectorAll('ul[aria-label="Leyenda del gráfico"] li')).toHaveLength(2);
    expect(text()).toContain('No quedan horas pendientes.');
  });

  it('says in words where the pace so far leads', async () => {
    await render(burndown(10, 40, [36, 30]));
    expect(text()).toContain('Al ritmo actual (5 h por día) las horas se agotarían el día 8');
    expect(text()).toContain('dentro del sprint.');

    await render(burndown(10, 40, [39, 36]));
    expect(text()).toContain('el día 20');
    expect(text()).toContain('10 días después de su fin.');

    await render(burndown(10, 40, [], { status: 'PLANNED' }));
    expect(text()).toContain('Aún no hay días registrados');

    await render(burndown(10, 40, [40, 40]));
    expect(text()).toContain('no se puede proyectar el final');

    await render(burndown(10, 40, [30, 12], { status: 'CLOSED' }));
    expect(text()).toContain('El sprint se cerró con 12 horas pendientes.');
  });

  it('has the same numbers in a table, with days that have not happened marked as such', async () => {
    await render(burndown(4, 40, [30]));

    const rows = [...root().querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent!.replace(/\s+/g, ' ').trim()));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual(['Inicio', 'Jan 4, 2026', '40', '40']);
    expect(rows[1]).toEqual(['1', 'Jan 5, 2026', '30', '30']);
    expect(rows[2][3]).toBe('— sin dato todavía');
    expect(root().querySelector('caption')?.textContent).toContain('Horas pendientes por día de Sprint 1');
  });

  it('draws again when the burndown changes, and when the theme does', async () => {
    await render();
    const drawn = chart.configs.length;

    fixture.componentRef.setInput('burndown', burndown(10, 40, [36, 30, 22]));
    fixture.detectChanges();
    expect(chart.configs.length).toBe(drawn + 1);

    document.documentElement.classList.add('dark');
    await vi.waitFor(() => expect(chart.configs.length).toBe(drawn + 2));
  });

  it('lets the chart go when it leaves the screen', async () => {
    await render();

    fixture.destroy();

    expect(chart.destroyed).toBe(true);
  });

  it('is free of accessibility violations', async () => {
    await render();

    await expectNoAxeViolations(root());
  });
});
