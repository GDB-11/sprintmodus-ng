import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, InjectionToken, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, Filler, LineController, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { Burndown } from '../../../projects/models/project.models';
import { ChartColors, ACTUAL_LABEL, IDEAL_LABEL, PROJECTION_LABEL, burndownChartConfig, crosshairPlugin } from '../../models/burndown-chart-config';
import { projectCompletion } from '../../models/burndown-projection';

/** What the component needs of a chart: draw this configuration (again), and go away. Specs stand in for the canvas. */
export interface ChartHandle {
  update(config: ChartConfiguration<'line'>): void;
  destroy(): void;
}

export const CHART_FACTORY = new InjectionToken<(canvas: HTMLCanvasElement) => ChartHandle>('CHART_FACTORY', {
  factory: () => (canvas) => {
    // Only what a line chart uses, so the rest of Chart.js is not shipped
    Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler, crosshairPlugin);
    let chart: Chart<'line'> | null = null;
    return {
      update(config) {
        if (!chart) {
          chart = new Chart(canvas, config);
          return;
        }
        chart.data = config.data;
        chart.options = config.options!;
        chart.update();
      },
      destroy() {
        chart?.destroy();
      },
    };
  },
});

const isDark = () => document.documentElement.classList.contains('dark');

/**
 * The burndown of a sprint: the ideal line, the real hours and, while the sprint runs, where the pace so far leads. Everything
 * the canvas shows is also on the page in words and in a table, and the colours come from the page's own theme: the legend
 * keys carry the theme classes and the chart reads what they compute to (light and dark are separate steps, checked against
 * their surfaces), so a theme change repaints it.
 */
@Component({
  selector: 'app-burndown-chart',
  imports: [DecimalPipe, DatePipe],
  templateUrl: './burndown-chart.html',
})
export class BurndownChart {
  private readonly createChart = inject(CHART_FACTORY);

  readonly burndown = input.required<Burndown>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly idealKey = viewChild.required<ElementRef<SVGElement>>('idealKey');
  private readonly actualKey = viewChild.required<ElementRef<SVGElement>>('actualKey');
  private readonly inkProbe = viewChild.required<ElementRef<HTMLElement>>('inkProbe');
  private readonly gridProbe = viewChild.required<ElementRef<HTMLElement>>('gridProbe');
  private readonly surfaceProbe = viewChild.required<ElementRef<HTMLElement>>('surfaceProbe');
  private readonly projectionKey = viewChild<ElementRef<SVGElement>>('projectionKey');

  protected readonly labels = { ideal: IDEAL_LABEL, actual: ACTUAL_LABEL, projection: PROJECTION_LABEL };
  protected readonly projection = computed(() => projectCompletion(this.burndown()));
  protected readonly projected = computed(() => {
    const projection = this.projection();
    return projection.kind === 'projected' ? projection : null;
  });

  /** The last real value, for the sentence that stands in for the picture. */
  protected readonly latest = computed(() => [...this.burndown().points].reverse().find((point) => point.day >= 1 && point.remainingHours != null));

  protected readonly summary = computed(() => {
    const burndown = this.burndown();
    const latest = this.latest();
    const start = `Burndown de ${burndown.sprintName}: ${burndown.baselineHours} horas al empezar`;
    return latest
      ? `${start}; el día ${latest.day} quedan ${latest.remainingHours} horas frente a ${latest.idealRemainingHours} de la línea ideal.`
      : `${start}; todavía no hay días registrados.`;
  });

  private readonly dark = signal(isDark());
  private readonly handle = signal<ChartHandle | null>(null);
  private observer: MutationObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.handle.set(this.createChart(this.canvas().nativeElement));
      // The page's theme is a class on <html>: a change repaints the chart
      this.observer = new MutationObserver(() => this.dark.set(isDark()));
      this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    });
    effect(() => {
      const handle = this.handle();
      if (!handle) {
        return;
      }
      this.dark(); // repaint when the theme changes
      const burndown = this.burndown();
      const projection = this.projection();
      const animate = !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
      untracked(() => handle.update(burndownChartConfig(burndown, projection, this.colors(), animate)));
    });
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.handle()?.destroy();
    });
  }

  private colors(): ChartColors {
    const paint = (element: Element | undefined, property: 'color' | 'backgroundColor' | 'borderTopColor') =>
      element ? getComputedStyle(element)[property] : '';
    return {
      ideal: paint(this.idealKey().nativeElement, 'color'),
      actual: paint(this.actualKey().nativeElement, 'color'),
      projection: paint(this.projectionKey()?.nativeElement ?? this.inkProbe().nativeElement, 'color'),
      ink: paint(this.inkProbe().nativeElement, 'color'),
      grid: paint(this.gridProbe().nativeElement, 'borderTopColor'),
      surface: paint(this.surfaceProbe().nativeElement, 'backgroundColor'),
    };
  }
}
