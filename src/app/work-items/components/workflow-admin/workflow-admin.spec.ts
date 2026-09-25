import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { WorkflowAdmin } from './workflow-admin';

const API = environment.apiUrl;

const WORKFLOW = {
  itemType: 'EPIC',
  statuses: [
    { code: 'BACKLOG', displayName: 'Backlog', order: 1, isTerminal: false },
    { code: 'CLOSED', displayName: 'Closed', order: 2, isTerminal: true },
  ],
  transitions: [{ from: 'BACKLOG', to: 'CLOSED', allowedBackward: true }],
};

describe('WorkflowAdmin', () => {
  let fixture: ComponentFixture<WorkflowAdmin>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowAdmin],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const alerts = () => [...root().querySelectorAll('[role="alert"]')].map((el) => el.textContent?.trim());
  const buttonWithText = (text: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === text)!;

  const codeInput = (row: number) =>
    root().querySelector<HTMLInputElement>(`input[aria-label="Código, fila ${row}"]`)!;
  const nameInput = (row: number) =>
    root().querySelector<HTMLInputElement>(`input[aria-label="Nombre para mostrar, fila ${row}"]`)!;
  const terminalInput = (row: number) =>
    root().querySelector<HTMLInputElement>(`input[aria-label="Final, fila ${row}"]`)!;
  const fromSelect = (row: number) =>
    root().querySelector<HTMLSelectElement>(`select[aria-label="De, fila ${row}"]`)!;
  const toSelect = (row: number) =>
    root().querySelector<HTMLSelectElement>(`select[aria-label="A, fila ${row}"]`)!;
  const backwardInput = (row: number) =>
    root().querySelector<HTMLInputElement>(`input[aria-label="Permite retroceder, fila ${row}"]`)!;

  async function open(workflow: typeof WORKFLOW = WORKFLOW): Promise<void> {
    fixture = TestBed.createComponent(WorkflowAdmin);
    fixture.detectChanges();
    http.expectOne(`${API}/api/status-workflows/EPIC`).flush(workflow);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it("shows the item type's statuses and transitions", async () => {
    await open();

    expect(codeInput(1).value).toBe('BACKLOG');
    expect(nameInput(1).value).toBe('Backlog');
    expect(terminalInput(1).checked).toBe(false);
    expect(terminalInput(2).checked).toBe(true);
    expect(fromSelect(1).value).toBe('BACKLOG');
    expect(toSelect(1).value).toBe('CLOSED');
    expect(backwardInput(1).checked).toBe(true);
  });

  it('reloads the workflow when the item type changes', async () => {
    await open();

    const select = root().querySelector<HTMLSelectElement>('#item-type')!;
    select.value = 'TASK';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    http.expectOne(`${API}/api/status-workflows/TASK`).flush({ itemType: 'TASK', statuses: [], transitions: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().textContent).toContain('Aún no hay estados.');
  });

  it('adds and removes a status row', async () => {
    await open();

    buttonWithText('Agregar estado').click();
    fixture.detectChanges();
    expect(codeInput(3)).not.toBeNull();

    buttonWithText('Quitar estado, fila 3').click();
    fixture.detectChanges();

    expect(codeInput(3)).toBeNull();
  });

  it('saves the edited workflow and confirms it', async () => {
    await open();

    buttonWithText('Guardar flujo de trabajo').click();

    const request = await vi.waitFor(() => http.expectOne(`${API}/api/admin/status-workflows`));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(WORKFLOW);
    request.flush(WORKFLOW);
    await fixture.whenStable();

    expect(
      TestBed.inject(NotificationService)
        .notifications()
        .map((n) => n.message),
    ).toEqual(['Flujo de trabajo guardado.']);
  });

  it("shows the backend's reason when the workflow is rejected", async () => {
    await open();

    buttonWithText('Guardar flujo de trabajo').click();
    (await vi.waitFor(() => http.expectOne(`${API}/api/admin/status-workflows`))).flush(
      { code: 'INVALID_WORKFLOW', message: 'Mark at least one status as terminal (a final status).' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(alerts()).toContain('Mark at least one status as terminal (a final status).');
  });

  it('has no accessibility violations', async () => {
    await open();
    await expectNoAxeViolations(root());
  });
});
