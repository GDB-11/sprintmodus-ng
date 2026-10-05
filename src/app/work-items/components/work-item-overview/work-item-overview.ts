import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { valueOf } from '../../../shared/resource-value';
import { DataTable, DataTableCell, DataTableColumn } from '../../../shared/ui/data-table/data-table';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ErrorState } from '../../../shared/ui/error-state/error-state';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { WorkItemSummary } from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { StatusLabel } from '../status-label/status-label';
import { WorkItemTypeIcon } from '../work-item-type-icon/work-item-type-icon';

/** Same cap every "the whole project" fetch in this app uses (the parent picker, Árbol's roots...). */
const SOURCE_SIZE = 200;
/** `ps-0`, `ps-4`, `ps-8`... kept as literal class names (not computed strings) so Tailwind's scanner finds them. */
const INDENT_CLASSES = ['ps-0', 'ps-4', 'ps-8', 'ps-12', 'ps-16', 'ps-20'];

interface FlatRow {
  item: WorkItemSummary;
  depth: number;
}

/** Builds a depth-first, indented row per item: roots first (no parent among the loaded items), then their
 * descendants, so the whole backlog reads as one flat hierarchy table. An item whose parent isn't in this page
 * (truncated, or in another project) is shown at depth 0 — it just loses its indentation, never disappears. */
function flatten(items: readonly WorkItemSummary[]): FlatRow[] {
  const byParent = new Map<string | undefined, WorkItemSummary[]>();
  const codes = new Set(items.map((item) => item.workItemCode));
  for (const item of items) {
    const key = item.parentCode && codes.has(item.parentCode) ? item.parentCode : undefined;
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  }
  const rows: FlatRow[] = [];
  const visit = (parentCode: string | undefined, depth: number) => {
    for (const item of byParent.get(parentCode) ?? []) {
      rows.push({ item, depth });
      visit(item.workItemCode, depth + 1);
    }
  };
  visit(undefined, 0);
  return rows;
}

const COLUMNS: DataTableColumn<FlatRow>[] = [{ header: 'Estado' }, { header: 'Elemento' }, { header: 'Clave' }];

/** The whole backlog of one project as a single indented table (Decision 3: `/work-items/overview`). */
@Component({
  selector: 'app-work-item-overview',
  imports: [RouterLink, PageHeader, TextLink, DataTable, DataTableCell, StatusLabel, WorkItemTypeIcon, EmptyState, ErrorState, Skeleton],
  templateUrl: './work-item-overview.html',
})
export class WorkItemOverview {
  private readonly workItems = inject(WorkItemService);
  protected readonly projectContext = inject(ProjectContextService);

  protected readonly columns = COLUMNS;
  protected readonly indentClasses = INDENT_CLASSES;

  protected readonly source = rxResource({
    params: () => {
      const project = this.projectContext.current();
      return project ? { projectCode: project.projectCode, size: SOURCE_SIZE } : undefined;
    },
    stream: ({ params }) => this.workItems.list(params),
  });

  protected readonly rows = computed(() => flatten(valueOf(this.source)?.items ?? []));
  protected readonly total = computed(() => valueOf(this.source)?.total ?? 0);
  protected readonly truncated = computed(() => this.total() > SOURCE_SIZE);

  protected indentClass(depth: number): string {
    return this.indentClasses[Math.min(depth, this.indentClasses.length - 1)];
  }

  protected trackByCode(row: FlatRow): string {
    return row.item.workItemCode;
  }
}
