import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ImportPreview } from '../../models/markdown-interchange';
import { WorkItemService } from '../../services/work-item.service';
import { MarkdownImport } from './markdown-import';

const preview = (overrides: Partial<ImportPreview> = {}): ImportPreview => ({
  dryRun: true,
  imported: false,
  total: 2,
  counts: { EPIC: 1, FEATURE: 1 },
  items: [
    {
      type: 'EPIC',
      title: 'Incorporación',
      line: 1,
      priority: 'HIGH',
      points: null,
      hours: null,
      sprint: null,
      assignee: null,
      hasDescription: true,
      criteria: 0,
      children: [
        { type: 'FEATURE', title: 'Verificación', line: 5, priority: null, points: null, hours: null, sprint: null, assignee: null, hasDescription: false, criteria: 2, children: [] },
      ],
    },
  ],
  diagnostics: [],
  created: [],
  ...overrides,
});

describe('MarkdownImport', () => {
  let fixture: ComponentFixture<MarkdownImport>;
  let service: {
    importMarkdown: ReturnType<typeof vi.fn>;
    importTemplate: ReturnType<typeof vi.fn>;
    importAiInstructions: ReturnType<typeof vi.fn>;
  };
  let writeText: ReturnType<typeof vi.fn>;

  const root = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...root().querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label)) as HTMLButtonElement | undefined;
  const type = (text: string) => {
    const area = root().querySelector('textarea') as HTMLTextAreaElement;
    area.value = text;
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  function create(parent: { workItemCode: string; type: 'EPIC' | 'FEATURE' | 'PBI' | 'TASK' | 'BUG' } | null) {
    fixture = TestBed.createComponent(MarkdownImport);
    fixture.componentRef.setInput('projectCode', 'p1');
    fixture.componentRef.setInput('parent', parent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = {
      importMarkdown: vi.fn(() => of(preview())),
      importTemplate: vi.fn(() => of('# Épica: Ejemplo\n')),
      importAiInstructions: vi.fn(() => of('Eres un asistente…')),
    };
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: WorkItemService, useValue: service }] });
  });

  it('offers nothing where nothing can be imported (a Task or a Bug)', () => {
    create({ workItemCode: 't1', type: 'TASK' });
    expect(root().querySelector('button')).toBeNull();

    create({ workItemCode: 'b1', type: 'BUG' });
    expect(root().querySelector('button')).toBeNull();
  });

  it('opens a dialog that explains what the file includes for the screen it was opened from', () => {
    create({ workItemCode: 'f1', type: 'FEATURE' });

    button('Importar desde Markdown')!.click();
    fixture.detectChanges();

    expect(root().querySelector('h2')?.textContent).toContain('Importar desde Markdown');
    expect(root().textContent).toContain('¿Qué incluye tu archivo?');
    expect(root().textContent).toContain('Descargar plantilla');
    expect(root().textContent).toContain('Copiar instrucciones para IA');
    expect(button('Revisar')!.disabled).toBe(true);
  });

  it('gets the template and the AI prompt for the chosen context', () => {
    create({ workItemCode: 'e1', type: 'EPIC' });
    button('Importar desde Markdown')!.click();
    fixture.detectChanges();
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();

    button('Descargar plantilla')!.click();
    button('Copiar instrucciones para IA')!.click();

    expect(service.importTemplate).toHaveBeenCalledWith('FEATURE', 1);
    expect(service.importAiInstructions).toHaveBeenCalledWith('FEATURE', 1);
    expect(download).toHaveBeenCalled();
    download.mockRestore();
  });

  it('reviews with a dry run, then imports under the parent and reports what was created', () => {
    const imported = vi.fn();
    create({ workItemCode: 'e1', type: 'EPIC' });
    fixture.componentInstance.imported.subscribe(imported);
    button('Importar desde Markdown')!.click();
    fixture.detectChanges();
    type('# Característica: Verificación\n');

    button('Revisar')!.click();
    fixture.detectChanges();

    expect(service.importMarkdown).toHaveBeenCalledWith('p1', 'e1', '# Característica: Verificación\n', true);
    expect(root().textContent).toContain('Se crearán 2 elementos: 1 épica, 1 característica.');
    expect(root().textContent).toContain('Verificación');
    expect(root().textContent).toContain('Aún no se ha guardado nada');

    service.importMarkdown.mockReturnValue(
      of(preview({ dryRun: false, imported: true, created: [{ workItemCode: 'new1', displayKey: 'WAR-1001', type: 'FEATURE', title: 'Verificación' }] })),
    );
    button('Importar 2 elementos')!.click();
    fixture.detectChanges();

    expect(service.importMarkdown).toHaveBeenLastCalledWith('p1', 'e1', '# Característica: Verificación\n', false);
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Se crearon 2 elementos');
    expect(root().querySelector('a')?.getAttribute('href')).toBe('/work-items/new1');
    expect(imported).toHaveBeenCalledOnce();
  });

  it('blocks the import on errors, lists them with their lines, and keeps warnings apart', () => {
    service.importMarkdown.mockReturnValue(
      of(
        preview({
          items: [],
          total: 0,
          counts: {},
          diagnostics: [
            { code: 'EPIC_NOT_ROOT', severity: 'ERROR', line: 14, params: { expected: 'EPIC', found: 'EPIC' } },
            { code: 'UNKNOWN_ASSIGNEE', severity: 'WARNING', line: 3, params: { assignee: 'Nadie' } },
          ],
        }),
      ),
    );
    create(null);
    button('Importar desde Markdown')!.click();
    fixture.detectChanges();
    type('# Épica: A\n');

    button('Revisar')!.click();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Línea 14: una Épica no puede estar dentro de otro elemento');
    expect(root().textContent).toContain('Avisos (no impiden importar)');
    expect(root().textContent).toContain('«Nadie»');
    expect(button('Importar 0 elementos')!.disabled).toBe(true);
    expect(root().textContent).toContain('Corrige los errores y vuelve a revisar');

    button('Volver a editar')!.click();
    fixture.detectChanges();
    expect(root().querySelector('textarea')).not.toBeNull();
  });

  it('shows the diagnostics when the server refuses a file with errors (400 with the preview body)', () => {
    create(null);
    button('Importar desde Markdown')!.click();
    fixture.detectChanges();
    type('# Épica: A\n');
    button('Revisar')!.click();
    fixture.detectChanges();
    service.importMarkdown.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: preview({ dryRun: false, diagnostics: [{ code: 'NO_ITEMS', severity: 'ERROR', line: 0, params: {} }] }),
          }),
      ),
    );

    button('Importar 2 elementos')!.click();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se encontró ningún elemento');
  });

  it('shows a plain failure (not about the file) as an alert and keeps the text', () => {
    service.importMarkdown.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { code: 'WORK_ITEM_NOT_FOUND', message: 'Work item not found.' } })));
    create({ workItemCode: 'e1', type: 'EPIC' });
    button('Importar desde Markdown')!.click();
    fixture.detectChanges();
    type('# Característica: A\n');

    button('Revisar')!.click();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Work item not found.');
    expect((root().querySelector('textarea') as HTMLTextAreaElement).value).toBe('# Característica: A\n');
  });

  it('has no accessibility violations (form, preview with errors)', async () => {
    create(null);
    button('Importar desde Markdown')!.click();
    fixture.detectChanges();
    await expectNoAxeViolations(root());

    service.importMarkdown.mockReturnValue(
      of(preview({ diagnostics: [{ code: 'UNKNOWN_SPRINT', severity: 'WARNING', line: 4, params: { sprint: 'S9' } }] })),
    );
    type('# Épica: A\n');
    button('Revisar')!.click();
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
