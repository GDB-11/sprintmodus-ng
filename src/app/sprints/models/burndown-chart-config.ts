import { ChartConfiguration } from 'chart.js';
import { Burndown } from '../../projects/models/project.models';
import { Projection, lastActualPoint } from './burndown-projection';

/** The colours of one theme, read from the page (so they are the theme's tokens, not values written down here). */
export interface ChartColors {
  ideal: string;
  actual: string;
  projection: string;
  /** Axis labels and titles. */
  ink: string;
  /** Gridlines: a step off the surface. */
  grid: string;
  /** The page's own colour: rings around markers keep them apart from the lines they sit on. */
  surface: string;
}

export const IDEAL_LABEL = 'Ideal';
export const ACTUAL_LABEL = 'Real';
export const PROJECTION_LABEL = 'Proyección';

/** Draws a vertical hairline at the day the pointer is on, so the reader aims at a day and not at a 2px line. */
export const crosshairPlugin = {
  id: 'burndownCrosshair',
  afterDatasetsDraw(chart: { tooltip?: { getActiveElements(): { element: { x: number } }[] }; ctx: CanvasRenderingContext2D; chartArea: { top: number; bottom: number }; options: { plugins?: { burndownCrosshair?: { color?: string } } } }) {
    const active = chart.tooltip?.getActiveElements() ?? [];
    if (active.length === 0) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(active[0].element.x, chartArea.top);
    ctx.lineTo(active[0].element.x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = chart.options.plugins?.burndownCrosshair?.color ?? 'currentColor';
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * The line chart of a burndown: the ideal line (dashed, no markers: it is a guide), the real hours (solid, a marker each day,
 * ringed in the surface colour), and, for a sprint still running, the projection from today to the day the hours run out
 * (dotted). The horizontal axis is the day of the sprint, so a projection past the sprint's last day simply runs on.
 * The legend is the page's own HTML, and the values are in a table beside the chart, so nothing depends on the canvas.
 */
export function burndownChartConfig(burndown: Burndown, projection: Projection, colors: ChartColors, animate: boolean): ChartConfiguration<'line'> {
  const actual = burndown.points.filter((point) => point.remainingHours != null).map((point) => ({ x: point.day, y: point.remainingHours! }));
  const last = lastActualPoint(burndown);
  const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
    {
      label: IDEAL_LABEL,
      data: burndown.points.map((point) => ({ x: point.day, y: point.idealRemainingHours })),
      borderColor: colors.ideal,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 12,
      tension: 0,
    },
    {
      label: ACTUAL_LABEL,
      data: actual,
      borderColor: colors.actual,
      borderWidth: 2,
      borderJoinStyle: 'round',
      borderCapStyle: 'round',
      pointRadius: 4,
      pointHoverRadius: 6,
      pointHitRadius: 12,
      pointBackgroundColor: colors.actual,
      pointBorderColor: colors.surface,
      pointBorderWidth: 2,
      tension: 0,
    },
  ];
  let lastDay = burndown.days;
  if (projection.kind === 'projected' && last) {
    lastDay = Math.max(lastDay, projection.finishDay);
    datasets.push({
      label: PROJECTION_LABEL,
      data: [
        { x: last.day, y: last.remainingHours! },
        { x: projection.finishDay, y: 0 },
      ],
      borderColor: colors.projection,
      borderWidth: 2,
      borderDash: [2, 4],
      pointRadius: [0, 4],
      pointBackgroundColor: colors.projection,
      pointBorderColor: colors.surface,
      pointBorderWidth: 2,
      pointHitRadius: 12,
      tension: 0,
    });
  }

  const axisText = { color: colors.ink };
  return {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: animate ? undefined : false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: lastDay,
          ticks: { ...axisText, stepSize: lastDay > 20 ? 5 : 1, callback: (value) => `${value}` },
          grid: { color: colors.grid, lineWidth: 1 },
          border: { color: colors.grid },
          title: { display: true, text: 'Día del sprint (0 = antes de empezar)', ...axisText },
        },
        y: {
          type: 'linear',
          beginAtZero: true,
          ticks: { ...axisText, maxTicksLimit: 6 },
          grid: { color: colors.grid, lineWidth: 1 },
          border: { color: colors.grid },
          title: { display: true, text: 'Horas pendientes', ...axisText },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Día ${items[0]?.parsed.x ?? ''}`,
            label: (item) => `${item.dataset.label}: ${item.parsed.y} h`,
          },
        },
        // read by crosshairPlugin
        ...({ burndownCrosshair: { color: colors.grid } } as object),
      },
    },
  };
}
