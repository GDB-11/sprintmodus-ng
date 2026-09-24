import { SchemaPath, validate } from '@angular/forms/signals';

/** Rejects text that is empty once trimmed: `required` alone accepts a value made only of spaces. */
export function notBlank(path: SchemaPath<string>, message: string): void {
  validate(path, ({ value }) => (value().trim() === '' ? { kind: 'blank', message } : null));
}
