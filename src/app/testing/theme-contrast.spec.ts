import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WCAG AA for the colour pairs the screens use, in light and dark mode, computed from the real tokens in `styles.css`.
 * Text needs 4.5:1; icons, borders and focus outlines need 3:1. Change a token or a pair and this tells you if it still passes.
 */
const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

/** Tailwind's default neutral scale (the theme does not redefine it), as OKLCH lightness. */
const NEUTRAL_LIGHTNESS: Record<string, number> = {
  '100': 0.97, '200': 0.922, '300': 0.87, '400': 0.708, '500': 0.556, '600': 0.439, '700': 0.371, '800': 0.269, '900': 0.205,
};

function token(name: string): [number, number, number] {
  const neutral = /^neutral-(\d+)$/.exec(name);
  if (neutral) {
    return [NEUTRAL_LIGHTNESS[neutral[1]], 0, 0];
  }
  if (name === 'white') {
    return [1, 0, 0];
  }
  const match = new RegExp(`--color-${name}:\\s*oklch\\(([0-9. ]+)\\)`).exec(css);
  if (!match) {
    throw new Error(`Unknown color token: ${name}`);
  }
  const [l, c, h] = match[1].trim().split(/\s+/).map(Number);
  return [l, c, h];
}

function luminance(name: string): number {
  const [L, C, h] = token(name);
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
  // clamped linear-light sRGB is what WCAG's relative luminance is defined on
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const TEXT = 4.5;
const GRAPHIC = 3;

const PAIRS: [foreground: string, background: string, minimum: number, use: string][] = [
  // light mode
  ['neutral-900', 'light-bg', TEXT, 'body text'],
  ['neutral-800', 'light-bg', TEXT, 'hints'],
  ['secondary-900', 'light-bg', TEXT, 'links'],
  ['error-800', 'light-bg', TEXT, 'field errors'],
  ['neutral-800', 'light-surface-secondary', TEXT, 'comment metadata'],
  ['neutral-900', 'light-surface-secondary', TEXT, 'comment text'],
  ['neutral-900', 'light-surface-tertiary', TEXT, 'inputs'],
  ['neutral-900', 'primary-500', TEXT, 'primary button'],
  ['neutral-900', 'primary-400', TEXT, 'primary button, hovered'],
  ['white', 'error-800', TEXT, 'delete button'],
  ['error-900', 'error-100', TEXT, 'error notification'],
  ['success-900', 'success-100', TEXT, 'success notification'],
  ['info-900', 'info-100', TEXT, 'info notification'],
  ['warning-900', 'warning-100', TEXT, 'warning notification'],
  ['neutral-700', 'light-bg', GRAPHIC, 'borders, initial status icon'],
  ['neutral-700', 'light-surface-tertiary', GRAPHIC, 'input borders'],
  ['info-800', 'light-bg', GRAPHIC, 'in-progress status icon'],
  ['success-800', 'light-bg', GRAPHIC, 'done status icon'],
  ['light-bg', 'success-800', GRAPHIC, 'done status check mark'],
  ['secondary-900', 'light-bg', GRAPHIC, 'focus outline'],
  ['error-800', 'error-100', GRAPHIC, 'error notification border'],
  ['success-800', 'success-100', GRAPHIC, 'success notification border'],
  ['info-800', 'info-100', GRAPHIC, 'info notification border'],
  ['warning-800', 'warning-100', GRAPHIC, 'warning notification border'],
  // dark mode
  ['neutral-100', 'dark-bg', TEXT, 'body text and inputs'],
  ['neutral-300', 'dark-bg', TEXT, 'hints'],
  ['secondary-400', 'dark-bg', TEXT, 'links'],
  ['error-300', 'dark-bg', TEXT, 'field errors'],
  ['neutral-100', 'dark-surface-secondary', TEXT, 'comment text'],
  ['neutral-300', 'dark-surface-secondary', TEXT, 'comment metadata'],
  ['secondary-400', 'dark-surface-secondary', TEXT, 'links on cards'],
  ['neutral-400', 'dark-bg', GRAPHIC, 'borders, initial status icon'],
  ['neutral-400', 'dark-surface-secondary', GRAPHIC, 'borders on cards'],
  ['info-300', 'dark-bg', GRAPHIC, 'in-progress status icon'],
  ['success-300', 'dark-bg', GRAPHIC, 'done status icon'],
  ['dark-bg', 'success-300', GRAPHIC, 'done status check mark'],
  ['secondary-400', 'dark-bg', GRAPHIC, 'focus outline'],
];

describe('theme colour pairs (WCAG AA)', () => {
  it.each(PAIRS)('%s on %s is at least %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });

  it('measures contrast the way WCAG does', () => {
    expect(contrast('white', 'neutral-100')).toBeLessThan(1.1);
    expect(contrast('neutral-100', 'neutral-900')).toBeGreaterThan(10);
  });
});
