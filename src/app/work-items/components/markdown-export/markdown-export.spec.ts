import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { stubLocalStorage } from '../../../auth/utils/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { WorkItemService } from '../../services/work-item.service';
import { MarkdownExport } from './markdown-export';

describe('MarkdownExport', () => {
  let fixture: ComponentFixture<MarkdownExport>;
  let exportMarkdown: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  let overlay: HTMLElement;

  const trigger = () => (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  const panelButton = (label: string) =>
    [...overlay.querySelectorAll('button')].find((button) => button.textContent?.trim() === label) as HTMLButtonElement;
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    stubLocalStorage();
    exportMarkdown = vi.fn(() => of('# Épica: Una\n'));
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await TestBed.configureTestingModule({
      imports: [MarkdownExport],
      providers: [{ provide: WorkItemService, useValue: { exportMarkdown } }],
    }).compileComponents();
    fixture = TestBed.createComponent(MarkdownExport);
    fixture.componentRef.setInput('workItemCodes', ['a', 'b']);
    fixture.componentRef.setInput('fileName', 'WAR-1000');
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  it('says it never includes the history and defaults to the children only', () => {
    expect(overlay.textContent).toContain('historial de cambios nunca se incluye');
    const boxes = [...overlay.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes.map((box) => box.checked)).toEqual([true, false, false]);
  });

  it('copies what the backend wrote and confirms it', async () => {
    panelButton('Copiar').click();
    await flush();

    expect(exportMarkdown).toHaveBeenCalledWith(['a', 'b'], ['children']);
    expect(writeText).toHaveBeenCalledWith('# Épica: Una\n');
    expect(overlay.querySelector('[role="status"]')?.textContent).toContain('Copiado');
  });

  it('remembers what to include', async () => {
    const links = overlay.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1];
    links.click();
    fixture.detectChanges();
    panelButton('Copiar').click();
    await flush();

    expect(exportMarkdown).toHaveBeenCalledWith(['a', 'b'], ['children', 'links']);
    expect(JSON.parse(localStorage.getItem('sprintmodus.export.include')!)).toEqual(['children', 'links']);
  });

  it('downloads as <key>.md', async () => {
    const created = vi.fn(() => 'blob:x');
    URL.createObjectURL = created;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    panelButton('Descargar .md').click();
    await flush();

    expect(created).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(overlay.querySelector('[role="status"]')?.textContent).toContain('WAR-1000.md');
    click.mockRestore();
  });

  it('says so when the export fails', async () => {
    exportMarkdown.mockReturnValue(throwError(() => new Error('boom')));

    panelButton('Copiar').click();
    await flush();

    expect(overlay.querySelector('[role="alert"]')?.textContent).toContain('No se pudo exportar');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    await expectNoAxeViolations(overlay);
  });

  it('hides the children option for Lista, which exports exactly its rows', () => {
    fixture.componentRef.setInput('withoutChildren', true);
    fixture.detectChanges();

    expect(overlay.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });
});
