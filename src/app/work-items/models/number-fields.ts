import { SchemaPath, validate } from '@angular/forms/signals';

/** A number typed into a text box: empty means "not given", anything else must parse. */
export function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

interface NumberRule {
  min: number;
  max: number;
  /** Most decimal places allowed; 0 means whole numbers only. */
  decimals: number;
  message: string;
}

/** Validates an optional number field held as text, with the same limits the backend enforces. */
export function optionalNumber(path: SchemaPath<string>, rule: NumberRule): void {
  validate(path, ({ value }) => {
    const text = value().trim();
    if (text === '') {
      return null;
    }
    const number = Number(text);
    const places = text.includes('.') ? text.split('.')[1].length : 0;
    const valid =
      Number.isFinite(number) && number >= rule.min && number <= rule.max && places <= rule.decimals;
    return valid ? null : { kind: 'number', message: rule.message };
  });
}

export const EFFORT_POINTS_RULE: NumberRule = {
  min: 0,
  max: 1000,
  decimals: 0,
  message: 'Enter a whole number from 0 to 1000.',
};

export const HOURS_RULE: NumberRule = {
  min: 0,
  max: 10000,
  decimals: 2,
  message: 'Enter hours from 0 to 10000, with at most two decimals.',
};
