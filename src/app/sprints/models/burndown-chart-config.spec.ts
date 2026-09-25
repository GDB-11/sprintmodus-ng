import { burndown } from '../../projects/projects.testing';
import { projectCompletion } from './burndown-projection';
import { ACTUAL_LABEL, ChartColors, IDEAL_LABEL, PROJECTION_LABEL, burndownChartConfig } from './burndown-chart-config';

const COLORS: ChartColors = { ideal: 'blue', actual: 'red', projection: 'gray', ink: 'black', grid: 'silver', surface: 'white' };

describe('burndownChartConfig', () => {
  const config = (data = burndown(10, 40, [36, 30])) => burndownChartConfig(data, projectCompletion(data), COLORS, true);
  const dataset = (label: string) => config().data.datasets.find((d) => d.label === label)!;

  it('draws the ideal line over every day, from the baseline to nothing, dashed and without markers', () => {
    const ideal = dataset(IDEAL_LABEL);

    expect((ideal.data as { x: number; y: number }[]).map((p) => p.y)).toEqual([40, 36, 32, 28, 24, 20, 16, 12, 8, 4, 0]);
    expect(ideal).toMatchObject({ borderColor: 'blue', borderWidth: 2, borderDash: [6, 4], pointRadius: 0 });
  });

  it('draws the real hours only for the days that happened, solid, with a ringed marker each day', () => {
    const actual = dataset(ACTUAL_LABEL);

    expect(actual.data).toEqual([
      { x: 0, y: 40 },
      { x: 1, y: 36 },
      { x: 2, y: 30 },
    ]);
    expect(actual).toMatchObject({ borderColor: 'red', borderWidth: 2, pointRadius: 4, pointBorderColor: 'white', pointBorderWidth: 2 });
    expect(actual.borderDash).toBeUndefined();
  });

  it('adds the projection from the last real day to the day the hours run out, and stretches the axis for one past the sprint', () => {
    const late = burndown(10, 40, [39, 36]);

    const withProjection = config(late);
    const projected = withProjection.data.datasets.find((d) => d.label === PROJECTION_LABEL)!;

    expect(projected.data).toEqual([
      { x: 2, y: 36 },
      { x: 20, y: 0 },
    ]);
    expect(projected).toMatchObject({ borderColor: 'gray', borderDash: [2, 4] });
    expect((withProjection.options!.scales!['x'] as { max: number }).max).toBe(20);
    expect((config().options!.scales!['x'] as { max: number }).max).toBe(10);
  });

  it('has no projection when there is nothing to project, and never a built-in legend (the page has its own)', () => {
    const finished = burndown(10, 40, [20, 0]);

    expect(config(finished).data.datasets.map((d) => d.label)).toEqual([IDEAL_LABEL, ACTUAL_LABEL]);
    expect(config().options!.plugins!.legend!.display).toBe(false);
  });

  it('shows one tooltip for the day with every series, and turns animation off when asked to', () => {
    const data = burndown(10, 40, [36]);

    expect(config().options!.interaction).toEqual({ mode: 'index', intersect: false });
    expect(burndownChartConfig(data, projectCompletion(data), COLORS, false).options!.animation).toBe(false);
  });

  it('labels the axes in words and takes the axis and grid colours it was given', () => {
    const scales = config().options!.scales as Record<string, { grid: { color: string }; title: { text: string }; ticks: { color: string } }>;

    expect(scales['y'].title.text).toBe('Horas pendientes');
    expect(scales['x'].title.text).toContain('Día del sprint');
    expect(scales['y'].grid.color).toBe('silver');
    expect(scales['y'].ticks.color).toBe('black');
  });
});
