import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../shared/http-errors';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Control } from '../../../shared/ui/control/control';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { DisabledReason } from '../../../shared/ui/disabled-reason/disabled-reason';
import { FileDrop } from '../../../shared/ui/file-drop/file-drop';
import { Icon } from '../../../shared/ui/icon/icon';
import { SelectMenu, SelectMenuOption } from '../../../shared/ui/select-menu/select-menu';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import {
  ImportDiagnostic,
  ImportPreview,
  describeCounts,
  diagnosticMessage,
  diagnosticMessages,
  importLevels,
  importRootFor,
} from '../../models/markdown-interchange';
import { ITEM_TYPE_LABELS, ItemType, PRIORITY_LABELS } from '../../models/work-item.models';
import { WorkItemService } from '../../services/work-item.service';
import { WorkItemTypeIcon } from '../work-item-type-icon/work-item-type-icon';

/**
 * Import from Markdown, in one dialog: pick what the file includes, get the template (or the prompt for an LLM), upload or
 * paste the file, review a dry run, confirm. The file names neither the project nor the parent: they are this screen's
 * (`projectCode`, and `parent` when opened from an Epic, Feature or PBI), which also decides the type of the top-level
 * items. Renders nothing where nothing can be imported (a Task or a Bug). The backend parses; this only shows its answer.
 */
@Component({
  selector: 'app-markdown-import',
  imports: [NgTemplateOutlet, RouterLink, Banner, Button, Control, Dialog, DisabledReason, FileDrop, Icon, SelectMenu, TextLink, WorkItemTypeIcon],
  templateUrl: './markdown-import.html',
})
export class MarkdownImport {
  private readonly workItems = inject(WorkItemService);

  readonly projectCode = input.required<string>();
  /** The item the import was opened from; `null` on the project's own list (the file's top level is Epics). */
  readonly parent = input<{ workItemCode: string; type: ItemType } | null>(null);
  /** Fires after the items were created, so the screen can reload. */
  readonly imported = output<ImportPreview>();

  protected readonly typeLabels = ITEM_TYPE_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly root = computed(() => importRootFor(this.parent()?.type ?? null));
  private readonly levelChoices = computed(() => (this.root() ? importLevels(this.root()!) : []));
  protected readonly levelOptions = computed<SelectMenuOption[]>(() =>
    this.levelChoices().map(({ levels, label }) => ({ value: String(levels), label })),
  );
  protected readonly levels = signal('1');
  private readonly levelCount = computed(() => Number(this.levels()) || 1);

  protected readonly open = signal(false);
  protected readonly text = signal('');
  protected readonly fileName = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly done = signal<ImportPreview | null>(null);
  /** A failure that is not about the file's content: network, permissions, a missing parent. */
  protected readonly failure = signal('');
  protected readonly helperStatus = signal<{ message: string; failed: boolean } | null>(null);

  protected readonly errors = computed(() => this.byLine(this.preview()?.diagnostics.filter((d) => d.severity === 'ERROR') ?? []));
  protected readonly warnings = computed(() => this.byLine(this.preview()?.diagnostics.filter((d) => d.severity === 'WARNING') ?? []));
  protected readonly warningMessages = computed(() => diagnosticMessages(this.warnings()));
  protected readonly summary = computed(() => describeCounts(this.preview()?.counts ?? {}));
  protected readonly doneSummary = computed(() => describeCounts(this.done()?.counts ?? {}));
  protected readonly canReview = computed(() => this.text().trim().length > 0 && !this.busy());

  protected show(): void {
    this.reset();
    this.open.set(true);
  }

  protected setLevels(value: string): void {
    this.levels.set(value);
    this.helperStatus.set(null);
  }

  protected onText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
    this.fileName.set(undefined);
    this.preview.set(null);
  }

  protected async onFile(file: File): Promise<void> {
    this.text.set(await file.text());
    this.fileName.set(file.name);
    this.preview.set(null);
    this.failure.set('');
  }

  protected downloadTemplate(): void {
    const root = this.root();
    if (!root) {
      return;
    }
    this.workItems.importTemplate(root, this.levelCount()).subscribe({
      next: (template) => {
        const url = URL.createObjectURL(new Blob([template], { type: 'text/markdown;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `plantilla-${root.toLowerCase()}-${this.levelCount()}.md`;
        link.click();
        URL.revokeObjectURL(url);
        this.helperStatus.set({ message: 'Plantilla descargada.', failed: false });
      },
      error: (error) => this.helperStatus.set({ message: apiErrorMessage(error), failed: true }),
    });
  }

  protected copyInstructions(): void {
    const root = this.root();
    if (!root) {
      return;
    }
    this.workItems.importAiInstructions(root, this.levelCount()).subscribe({
      next: async (instructions) => {
        try {
          await navigator.clipboard.writeText(instructions);
          this.helperStatus.set({ message: 'Instrucciones copiadas. Pégalas en tu asistente de IA junto con tu resumen.', failed: false });
        } catch {
          this.helperStatus.set({ message: 'No se pudo copiar al portapapeles.', failed: true });
        }
      },
      error: (error) => this.helperStatus.set({ message: apiErrorMessage(error), failed: true }),
    });
  }

  protected review(): void {
    this.send(true);
  }

  protected confirm(): void {
    this.send(false);
  }

  protected backToEditing(): void {
    this.preview.set(null);
  }

  protected message(diagnostic: ImportDiagnostic): string {
    return diagnosticMessage(diagnostic);
  }

  protected metadata(item: { priority: string | null; points: number | null; hours: number | null; sprint: string | null; assignee: string | null }): string {
    return [
      item.priority ? `prioridad ${PRIORITY_LABELS[item.priority as keyof typeof PRIORITY_LABELS].toLowerCase()}` : '',
      item.points !== null ? `${item.points} puntos` : '',
      item.hours !== null ? `${item.hours} h` : '',
      item.sprint ? `sprint ${item.sprint}` : '',
      item.assignee ? `asignado a ${item.assignee}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private send(dryRun: boolean): void {
    this.busy.set(true);
    this.failure.set('');
    this.workItems.importMarkdown(this.projectCode(), this.parent()?.workItemCode ?? null, this.text(), dryRun).subscribe({
      next: (result) => {
        this.busy.set(false);
        if (dryRun) {
          this.preview.set(result);
        } else {
          this.done.set(result);
          this.imported.emit(result);
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as Partial<ImportPreview> | null) : null;
        if (body && Array.isArray(body.diagnostics)) {
          // the file has errors: the same body as a preview, so the user sees every line to fix
          this.preview.set(body as ImportPreview);
        } else {
          this.failure.set(apiErrorMessage(error, 'No se pudo importar el archivo. Inténtalo de nuevo.'));
        }
      },
    });
  }

  private byLine(diagnostics: ImportDiagnostic[]): ImportDiagnostic[] {
    return [...diagnostics].sort((a, b) => a.line - b.line);
  }

  private reset(): void {
    this.text.set('');
    this.fileName.set(undefined);
    this.preview.set(null);
    this.done.set(null);
    this.failure.set('');
    this.helperStatus.set(null);
    this.levels.set('1');
  }
}
