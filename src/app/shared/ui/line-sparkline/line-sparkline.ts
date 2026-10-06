import { Component, computed, input } from '@angular/core';

const WIDTH = 240;
const HEIGHT = 56;
const PAD = 4;

/**
 * A tiny two-line trend (an ideal dashed line and an actual solid one, with a marker on the last actual value), the
 * dashboard's burndown preview. Decorative detail only: `label` says the same thing in words, and the full chart with its
 * table lives on the burndown page. Colours are the chart-line tokens (`theme-contrast.spec.ts`), dash pattern differs too.
 */
@Component({
  selector: 'app-line-sparkline',
  templateUrl: './line-sparkline.html',
})
export class LineSparkline {
  readonly ideal = input.required<readonly number[]>();
  /** One value per day; `null`/`undefined` for days that have not happened. */
  readonly actual = input.required<readonly (number | null | undefined)[]>();
  readonly label = input.required<string>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  private readonly max = computed(() => Math.max(1, ...this.ideal(), ...this.actual().map((v) => v ?? 0)));

  private x(index: number): number {
    const last = Math.max(1, this.ideal().length - 1);
    return PAD + (index / last) * (WIDTH - PAD * 2);
  }

  private y(value: number): number {
    return Math.round((PAD + (1 - value / this.max()) * (HEIGHT - PAD * 2)) * 10) / 10;
  }

  protected readonly idealPath = computed(() => this.ideal().map((v, i) => `${i === 0 ? 'M' : 'L'}${this.x(i)},${this.y(v)}`).join(' '));

  protected readonly actualPath = computed(() =>
    this.actual()
      .map((v, i) => (v == null ? null : `${i === 0 || this.actual()[i - 1] == null ? 'M' : 'L'}${this.x(i)},${this.y(v)}`))
      .filter((part) => part !== null)
      .join(' '),
  );

  protected readonly lastPoint = computed(() => {
    const values = this.actual();
    for (let i = values.length - 1; i >= 0; i--) {
      const value = values[i];
      if (value != null) {
        return { x: this.x(i), y: this.y(value) };
      }
    }
    return null;
  });
}
