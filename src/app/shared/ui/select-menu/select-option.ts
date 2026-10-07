export interface SelectMenuOption {
  value: string;
  label: string;
  /** A short secondary tag shown beside the label (a project key, for example). */
  hint?: string;
  /** Shown but not choosable (a status move that needs a role the user lacks): say why in the label or hint. */
  disabled?: boolean;
}

/** Lower-case without accents, so "revision" finds "Revisión". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** The next choosable option from `from` in `step` direction (wrapping), or -1 when none is. */
export function nextEnabledIndex(options: readonly SelectMenuOption[], from: number, step: 1 | -1): number {
  const count = options.length;
  for (let offset = 1; offset <= count; offset++) {
    const index = (((from + step * offset) % count) + count) % count;
    if (!options[index].disabled) {
      return index;
    }
  }
  return -1;
}
