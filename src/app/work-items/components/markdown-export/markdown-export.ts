import { OverlayModule } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { apiErrorMessage } from '../../../shared/http-errors';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Icon } from '../../../shared/ui/icon/icon';
import { Popover } from '../../../shared/ui/popover/popover';
import { ExportInclude, WorkItemService } from '../../services/work-item.service';

const STORAGE_KEY = 'sprintmodus.export.include';
/** More roots than this are cut (one request each); the status line says so. */
export const MAX_EXPORT_ROOTS = 30;

function remembered(): ExportInclude[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(stored)) {
      return stored.filter((value): value is ExportInclude => ['children', 'links', 'comments'].includes(value));
    }
  } catch {
    // storage blocked or corrupt: fall through to the default
  }
  return ['children'];
}

/**
 * "Exportar a Markdown": copies or downloads the item (or items) and, as chosen, its subtree, links and comments, written
 * by the backend in Spanish. Never the audit history. What to include is remembered per browser.
 */
@Component({
  selector: 'app-markdown-export',
  imports: [OverlayModule, Popover, Banner, Button, Checkbox, Icon],
  templateUrl: './markdown-export.html',
})
export class MarkdownExport {
  private readonly workItems = inject(WorkItemService);
  private readonly document = inject(DOCUMENT);

  /** The items to write, one after the other. */
  readonly workItemCodes = input.required<readonly string[]>();
  /** The downloaded file is `<fileName>.md`. */
  readonly fileName = input('elementos');
  /** Lista exports exactly the rows it shows, so their subtrees are not repeated. */
  readonly withoutChildren = input(false);

  protected readonly maxRoots = MAX_EXPORT_ROOTS;
  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  /** Said in a live region: "Copiado…", or why it failed. */
  protected readonly status = signal('');
  protected readonly failed = signal(false);

  private readonly included = signal<ExportInclude[]>(remembered());
  protected readonly children = computed(() => !this.withoutChildren() && this.included().includes('children'));
  protected readonly links = computed(() => this.included().includes('links'));
  protected readonly comments = computed(() => this.included().includes('comments'));
  protected readonly cut = computed(() => this.workItemCodes().length > MAX_EXPORT_ROOTS);

  protected toggle(kind: ExportInclude, checked: boolean): void {
    this.included.update((current) => (checked ? [...new Set([...current, kind])] : current.filter((value) => value !== kind)));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.included()));
    } catch {
      // not remembered: the choice still applies to this export
    }
  }

  protected async copy(): Promise<void> {
    const markdown = await this.load();
    if (markdown === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      this.say(this.cutNotice('Copiado al portapapeles.'), false);
    } catch {
      this.say('No se pudo copiar. Usa «Descargar .md».', true);
    }
  }

  protected async download(): Promise<void> {
    const markdown = await this.load();
    if (markdown === null) {
      return;
    }
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `${this.fileName()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    this.say(this.cutNotice(`Descargado ${this.fileName()}.md.`), false);
  }

  private async load(): Promise<string | null> {
    this.busy.set(true);
    this.status.set('');
    const include: ExportInclude[] = [
      ...(this.children() ? (['children'] as const) : []),
      ...(this.links() ? (['links'] as const) : []),
      ...(this.comments() ? (['comments'] as const) : []),
    ];
    try {
      const codes = this.workItemCodes().slice(0, MAX_EXPORT_ROOTS);
      return await new Promise<string>((resolve, reject) =>
        this.workItems.exportMarkdown(codes, include).subscribe({ next: resolve, error: reject }),
      );
    } catch (error) {
      this.say(apiErrorMessage(error, 'No se pudo exportar. Inténtalo de nuevo.'), true);
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  private cutNotice(message: string): string {
    return this.cut() ? `${message} Solo los primeros ${MAX_EXPORT_ROOTS} elementos.` : message;
  }

  private say(message: string, failed: boolean): void {
    this.failed.set(failed);
    this.status.set(message);
  }
}
