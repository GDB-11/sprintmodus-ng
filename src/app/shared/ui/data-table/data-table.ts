import { NgTemplateOutlet } from '@angular/common';
import { Component, Directive, TemplateRef, contentChildren, input } from '@angular/core';

export interface DataTableColumn<T> {
  header: string;
  numeric?: boolean;
  /** Plain-text rendering of the cell. Omit when a matching `appDataTableCell` template (same position) renders it instead. */
  cell?: (row: T) => string;
}

/**
 * Marks an `<ng-template>` as the rich content of one column, matched to `columns` by position (the first
 * `appDataTableCell` renders the first column that has one, and so on). Use it when a column needs a component
 * (`app-status-label`, `app-priority-chip`...) instead of plain text.
 */
@Directive({ selector: 'ng-template[appDataTableCell]' })
export class DataTableCell {}

/**
 * A table with an `sr-only` caption and right-aligned numeric columns on desktop, and the same content as stacked
 * cards below `md`. A `trackBy` is required so rows can be tracked without relying on object identity.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
})
export class DataTable<T> {
  readonly caption = input.required<string>();
  readonly columns = input.required<readonly DataTableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly trackBy = input.required<(row: T) => unknown>();

  protected readonly cellTemplates = contentChildren(DataTableCell, { read: TemplateRef });

  protected templateFor(columnIndex: number): TemplateRef<{ $implicit: T }> | undefined {
    return this.cellTemplates()[columnIndex] as TemplateRef<{ $implicit: T }> | undefined;
  }

  protected textOf(column: DataTableColumn<T>, row: T): string {
    return column.cell?.(row) ?? '';
  }
}
