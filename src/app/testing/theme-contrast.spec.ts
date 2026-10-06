import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WCAG AA for the colour pairs the screens use, in light and dark mode, computed from the real tokens in `styles.css`.
 * Text needs 4.5:1; icons, borders and focus outlines need 3:1. Change a token or a pair and this tells you if it still
 * passes. Most tokens hold one value used in both themes (dark mode is reached by a template picking a different step,
 * e.g. `secondary-900` in light / `secondary-400` in dark). A few tokens (the primary/secondary accent's 400/500/600/700/900
 * steps, `text`/`text-muted`/`text-faint`, the glass/control surfaces and the wallpaper stops) have a real per-theme value,
 * read here from the `:root.dark { ... }` override block in `styles.css`.
 */
const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

const THEME_BLOCK = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const DARK_BLOCK = /:root\.dark\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

type Color = { l: number; c: number; h: number } | { r: number; g: number; b: number; a: number };

function isRgba(color: Color): color is { r: number; g: number; b: number; a: number } {
  return 'r' in color;
}

function parseValue(raw: string): Color {
  const oklch = /oklch\(([0-9. ]+)\)/.exec(raw);
  if (oklch) {
    const [l, c, h] = oklch[1].trim().split(/\s+/).map(Number);
    return { l, c, h };
  }
  const rgba = /rgba?\(([0-9. ,]+)\)/.exec(raw);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()));
    const [r, g, b, a = 1] = parts;
    return { r: r / 255, g: g / 255, b: b / 255, a };
  }
  throw new Error(`Unparseable colour value: ${raw}`);
}

/** Reads a token's value: the `:root.dark` override if `theme` is 'dark' and one exists, else the `@theme` value. */
function token(name: string, theme: 'light' | 'dark' = 'light'): Color {
  if (name === 'white') {
    return { l: 1, c: 0, h: 0 };
  }
  if (theme === 'dark') {
    const darkMatch = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(DARK_BLOCK);
    if (darkMatch) {
      return parseValue(darkMatch[1]);
    }
  }
  const match = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(THEME_BLOCK);
  if (!match) {
    throw new Error(`Unknown color token: ${name}`);
  }
  return parseValue(match[1]);
}

function luminanceOklch(l: number, c: number, h: number): number {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
  // clamped linear-light sRGB is what WCAG's relative luminance is defined on
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminanceRgb(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function luminance(color: Color): number {
  return isRgba(color) ? luminanceRgb(color.r, color.g, color.b) : luminanceOklch(color.l, color.c, color.h);
}

function toRgb01(color: Color): [number, number, number] {
  if (isRgba(color)) {
    return [color.r, color.g, color.b];
  }
  const { l, c, h } = color;
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
  const toSrgb = (channel: number) => (channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055);
  return linear.map((channel) => Math.min(1, Math.max(0, toSrgb(channel)))) as [number, number, number];
}

/** Alpha-composites a translucent foreground (e.g. `glass-bg`) over an opaque background, sRGB-space (as the browser does for `backdrop-filter` surfaces). */
function compositeOver(fg: Color, bg: Color): Color {
  if (!isRgba(fg)) {
    throw new Error('compositeOver expects a translucent (rgba) foreground');
  }
  const [br, bg_, bb] = toRgb01(bg);
  const { r, g, b, a } = fg;
  return { r: r * a + br * (1 - a), g: g * a + bg_ * (1 - a), b: b * a + bb * (1 - a), a: 1 };
}

function contrastColors(foreground: Color, background: Color): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function contrast(foreground: string, background: string, theme: 'light' | 'dark' = 'light'): number {
  return contrastColors(token(foreground, theme), token(background, theme));
}

/** Worst-case contrast of a token over a translucent glass/control surface composited over each wallpaper stop. */
function contrastOnGlass(foreground: string, glassToken: string, theme: 'light' | 'dark' = 'light'): number {
  const fg = token(foreground, theme);
  const glass = token(glassToken, theme);
  const stops = ['wall-a', 'wall-b', 'wall-c'].map((name) => token(name, theme));
  return Math.min(...stops.map((stop) => contrastColors(fg, compositeOver(glass, stop))));
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
  ['neutral-900', 'neutral-200', TEXT, 'low priority chip'],
  ['info-700', 'light-bg', GRAPHIC, 'burndown ideal line'],
  ['light-bg', 'type-epic', GRAPHIC, 'epic type glyph'],
  ['light-bg', 'type-feature', GRAPHIC, 'feature type glyph'],
  ['light-bg', 'type-pbi', GRAPHIC, 'PBI type glyph'],
  ['light-bg', 'type-bug', GRAPHIC, 'bug type glyph'],
  ['neutral-900', 'type-task', GRAPHIC, 'task type glyph'],
  ['error-700', 'light-bg', GRAPHIC, 'burndown real line'],
  ['neutral-700', 'light-bg', GRAPHIC, 'borders, initial status icon'],
  ['neutral-700', 'light-surface-tertiary', GRAPHIC, 'input borders'],
  ['secondary-900', 'light-surface-secondary', TEXT, 'links on cards'],
  ['neutral-700', 'light-surface-secondary', GRAPHIC, 'card borders'],
  ['info-800', 'light-bg', GRAPHIC, 'in-progress status icon'],
  ['success-800', 'light-bg', GRAPHIC, 'done status icon'],
  ['light-bg', 'success-800', GRAPHIC, 'done status check mark'],
  ['secondary-900', 'light-bg', GRAPHIC, 'focus outline'],
  ['error-800', 'error-100', GRAPHIC, 'error notification border'],
  ['success-800', 'success-100', GRAPHIC, 'success notification border'],
  ['info-800', 'info-100', GRAPHIC, 'info notification border'],
  ['warning-800', 'warning-100', GRAPHIC, 'warning notification border'],
  ['warning-800', 'light-bg', GRAPHIC, 'live connection indicator, connecting'],
  ['error-800', 'light-bg', GRAPHIC, 'live connection indicator, offline'],
  ['secondary-900', 'secondary-100', TEXT, 'mention in a comment'],
  ['white', 'secondary-900', TEXT, 'unread badge and "Sin leer" chip'],
  // new (Phase 15): text ink on the plain page background
  ['text', 'light-bg', TEXT, 'body text (new ink token)'],
  ['text-muted', 'light-bg', TEXT, 'hints (new ink token)'],
  ['text-faint', 'light-bg', GRAPHIC, 'decoration / small text, e.g. issue keys, dates (new ink token)'],
  // new (Phase 15): the button primitive's white-ink fill must be dark enough on the primary gradient
  ['white', 'primary-700', TEXT, 'primary button fill (white ink; primary-500/600 fail, see corrections note)'],
  ['white', 'primary-900', TEXT, 'primary button, pressed'],
];

const DARK_PAIRS: [foreground: string, background: string, minimum: number, use: string][] = [
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
  ['warning-300', 'dark-bg', GRAPHIC, 'live connection indicator, connecting'],
  ['error-300', 'dark-bg', GRAPHIC, 'live connection indicator, offline'],
  ['info-600', 'dark-bg', GRAPHIC, 'burndown ideal line'],
  ['error-500', 'dark-bg', GRAPHIC, 'burndown real line'],
  ['secondary-100', 'secondary-900', TEXT, 'mention in a comment'],
  ['neutral-900', 'secondary-400', TEXT, 'unread badge and "Sin leer" chip'],
  // new (Phase 15): text ink on the plain page background
  ['text', 'dark-bg', TEXT, 'body text (new ink token)'],
  ['text-muted', 'dark-bg', TEXT, 'hints (new ink token)'],
  ['text-faint', 'dark-bg', GRAPHIC, 'decoration / small text, e.g. issue keys, dates (new ink token)'],
  ['white', 'primary-700', TEXT, 'primary button fill (white ink)'],
  ['white', 'primary-900', TEXT, 'primary button, pressed'],
];

/** Text/decoration on the translucent glass panel, checked against every wallpaper stop (the worst one gates it). */
const GLASS_PAIRS: [foreground: string, minimum: number, use: string][] = [
  ['text', TEXT, 'body text on a glass panel'],
  ['text-muted', TEXT, 'hints on a glass panel'],
  ['text-faint', GRAPHIC, 'decoration / small text on a glass panel'],
];

describe('theme colour pairs (WCAG AA)', () => {
  it.each(PAIRS)('%s on %s is at least %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrast(foreground, background, 'light')).toBeGreaterThanOrEqual(minimum);
  });

  it.each(DARK_PAIRS)('dark: %s on %s is at least %d:1 (%s)', (foreground, background, minimum) => {
    expect(contrast(foreground, background, 'dark')).toBeGreaterThanOrEqual(minimum);
  });

  it.each(GLASS_PAIRS)('%s on glass-bg over the worst wallpaper stop is at least %d:1 (%s), light', (foreground, minimum) => {
    expect(contrastOnGlass(foreground, 'glass-bg', 'light')).toBeGreaterThanOrEqual(minimum);
  });

  it.each(GLASS_PAIRS)('%s on glass-bg over the worst wallpaper stop is at least %d:1 (%s), dark', (foreground, minimum) => {
    expect(contrastOnGlass(foreground, 'glass-bg', 'dark')).toBeGreaterThanOrEqual(minimum);
  });

  it('measures contrast the way WCAG does', () => {
    // neutral-100 is a near-white tint (not pure white), so this is "practically indistinguishable", not "identical"
    expect(contrast('white', 'neutral-100')).toBeLessThan(1.2);
    expect(contrast('neutral-100', 'neutral-900')).toBeGreaterThan(10);
  });

  it('reads the dark-mode override for a token that has one, and falls back for one that does not', () => {
    // primary-500 is slightly lighter/more saturated in dark mode (see styles.css)
    expect(luminance(token('primary-500', 'light'))).toBeLessThan(luminance(token('primary-500', 'dark')));
    // secondary-900 has no dark override (kept flat on purpose, see styles.css), so both themes read the same value
    expect(token('secondary-900', 'light')).toEqual(token('secondary-900', 'dark'));
  });
});
