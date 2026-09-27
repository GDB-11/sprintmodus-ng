import { Component, input } from '@angular/core';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => string;
  numeric?: boolean;
}

/**
 * A table with an `sr-only` caption and right-aligned numeric columns on desktop, and the same content as stacked
 * cards below `md`. A `trackBy` is required so rows can be tracked without relying on object identity.
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.html',
})
export class DataTable<T> {
  readonly caption = input.required<string>();
  readonly columns = input.required<readonly DataTableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly trackBy = input.required<(row: T) => unknown>();
}
