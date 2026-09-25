import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { FakeBoard, provideFakeBoard } from '../../../board/board.testing';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { APPROVED_STATUS, NEW_STATUS, summary, workItem } from '../../work-items.testing';
import { WorkItem } from '../../models/work-item.models';
import { WorkItemDetail } from './work-item-detail';
import { expectNoAxeViolations } from '../../../testing/axe';

const API = environment.apiUrl;
const ITEM_URL = `${API}/api/work-items/item-1`;

const SPRINTS = [
  { sprintCode: 's1', projectCode: 'project-1', name: 'Sprint 1', status: 'ACTIVE' },
  { sprintCode: 's0', projectCode: 'project-1', name: 'Sprint 0', status: 'CLOSED' },
];

describe('WorkItemDetail', () => {
  let fixture: ComponentFixture<WorkItemDetail>;
  let http: HttpTestingController;
  let router: Router;
  let notifications: NotificationService;
  let board: FakeBoard;
  let auth: FakeAuth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemDetail],
      providers: [
        provideRouter([]),
        // the component under test is created outside the router outlet, so it is given the route it would receive
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ code: 'item-1' })) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFakeBoard(),
        provideFakeAuth(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notifications = TestBed.inject(NotificationService);
    board = TestBed.inject(BoardWebSocketService) as unknown as FakeBoard;
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const control = <T extends HTMLElement>(id: string) => root().querySelector<T>(`#${id}`)!;
  const messages = () => notifications.notifications().map((n) => [n.kind, n.message]);

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Opens the item and answers the three requests the page makes for it. */
  async function open(item: WorkItem = workItem()): Promise<void> {
    fixture = TestBed.createComponent(WorkItemDetail);
    fixture.detectChanges();
    http.expectOne(ITEM_URL).flush(item);
    fixture.detectChanges();
    (await vi.waitFor(() => http.expectOne(`${API}/api/sprints?projectCode=project-1`))).flush(SPRINTS);
    (await vi.waitFor(() => http.expectOne((r) => r.url === `${API}/api/work-items` && r.params.get('size') === '200'))).flush({
      items: [
        summary(),
        summary({ workItemCode: 'epic-1', displayKey: 'WAR-999', title: 'Checkout', type: 'EPIC' }),
      ],
      total: 2,
      page: 0,
      size: 200,
    });
    // comments of the child component
    http.expectOne(`${ITEM_URL}/comments`).flush([]);
    await settle();
  }

  async function choose(id: string, value: string): Promise<void> {
    const select = control<HTMLSelectElement>(id);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('shows the item with its status and only the statuses it can move to', async () => {
    await open(workItem({ description: 'Line one\nLine two', assignees: [{ assignmentCode: 'a1', userCode: 'u1', fullName: 'Mia Member', role: 'DEV' }] }));

    expect(root().querySelector('h1')?.textContent).toBe('Pay by card');
    expect(root().textContent).toContain('WAR-1000 · Elemento del backlog');
    expect(root().textContent).toContain('New');
    expect(root().textContent).toContain('Mia Member (Desarrollo)');
    expect(root().textContent).toContain('Line one');
    const options = [...control<HTMLSelectElement>('change-status').options].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Elige un estado', 'Approved']);
  });

  it("shows the children's rolled-up effort next to the item's own, only when there is one", async () => {
    await open(workItem({ effortPoints: 5, childrenEffortPoints: 0 }));
    expect(root().textContent).not.toContain('tareas secundarias');

    await open(workItem({ effortPoints: 5, childrenEffortPoints: 8 }));
    expect(root().textContent).toContain('tareas secundarias: 8');
  });

  it('offers no status when the workflow has no move from here', async () => {
    await open(workItem({ allowedStatuses: [] }));

    expect(root().querySelector('select#change-status')).toBeNull();
    expect(root().textContent).toContain('Sin más estados');
  });

  it('changes the status and shows the backend answer', async () => {
    await open();
    await choose('change-status', 'APPROVED');

    const request = http.expectOne(`${ITEM_URL}/status`);
    expect(request.request.body).toEqual({ status: 'APPROVED' });
    request.flush(workItem({ status: APPROVED_STATUS, allowedStatuses: [NEW_STATUS] }));
    await settle();

    expect(root().textContent).toContain('Approved');
    expect([...control<HTMLSelectElement>('change-status').options].map((o) => o.textContent?.trim())).toEqual([
      'Elige un estado',
      'New',
    ]);
    // the change did not reload the sprints or the parent candidates
    http.expectNone(`${API}/api/sprints?projectCode=project-1`);
  });

  it('explains a refused transition and reloads the item', async () => {
    await open();
    await choose('change-status', 'APPROVED');

    http.expectOne(`${ITEM_URL}/status`).flush(
      { code: 'STATUS_CHANGED_CONCURRENTLY', message: 'Someone else changed the status. Reload and try again.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(messages()).toEqual([['error', 'Someone else changed the status. Reload and try again.']]);
    (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem({ status: APPROVED_STATUS }));
    await settle();
    expect(root().textContent).toContain('Approved');
  });

  describe('what a regular member may not do', () => {
    beforeEach(() => auth.becomes('MEMBER', 'someone-else'));

    it('shows the sprint as text, without the list to change it', async () => {
      await open(workItem({ sprintCode: 's1' }));

      expect(control('sprint')).toBeNull();
      const details = root().querySelector('dl')!.textContent!.replace(/\s+/g, ' ');
      expect(details).toContain('Sprint 1');
      expect(details).toContain('Solo los propietarios y administradores planifican los sprints.');
    });

    it('says the item is in the backlog when it is in no sprint', async () => {
      await open();

      expect(root().querySelector('dl')!.textContent).toContain('Backlog (sin sprint)');
    });

    it('disables deleting an item somebody else created, and says who can', async () => {
      await open();
      const del = [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Eliminar')!;

      expect(del.disabled).toBe(true);
      expect(del.getAttribute('aria-describedby')).toBe('delete-hint');
      expect(root().querySelector('#delete-hint')?.textContent).toContain('Solo quien lo creó');
    });

    it('lets them delete what they created', async () => {
      auth.becomes('MEMBER', 'user-1');
      await open();
      const del = [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Eliminar')!;

      expect(del.disabled).toBe(false);
      expect(root().querySelector('#delete-hint')).toBeNull();
    });

    it('has no accessibility violations', async () => {
      await open(workItem({ sprintCode: 's1' }));

      await expectNoAxeViolations(root());
    });
  });

  it('moves the item to a sprint and back to the backlog, offering only open sprints', async () => {
    await open();
    const options = [...control<HTMLSelectElement>('sprint').options].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Backlog (sin sprint)', 'Sprint 1']);

    await choose('sprint', 's1');
    const move = http.expectOne(`${ITEM_URL}/sprint`);
    expect(move.request.method).toBe('PUT');
    expect(move.request.body).toEqual({ sprintCode: 's1' });
    move.flush(workItem({ sprintCode: 's1' }));
    await settle();

    await choose('sprint', '');
    const back = http.expectOne(`${ITEM_URL}/sprint`);
    expect(back.request.method).toBe('DELETE');
    back.flush(workItem());
    await settle();
  });

  it('sets a parent and surfaces the backend warning for a non-standard one', async () => {
    await open(workItem({ type: 'TASK' }));
    expect([...control<HTMLSelectElement>('parent').options].map((o) => o.textContent?.trim().replace(/\s+/g, ' '))).toEqual([
      'Sin elemento superior',
      'WAR-999 · Checkout (Épica)',
    ]);

    await choose('parent', 'epic-1');
    const request = http.expectOne(`${ITEM_URL}/parent`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ parentCode: 'epic-1' });
    request.flush(
      workItem({
        parentCode: 'epic-1',
        warnings: [{ code: 'NON_STANDARD_HIERARCHY', message: 'EPIC is not a recommended parent for TASK.' }],
      }),
    );
    await settle();

    expect(messages()).toEqual([['warning', 'EPIC is not a recommended parent for TASK.']]);
    expect(control<HTMLSelectElement>('parent').value).toBe('epic-1');
  });

  it('puts the select back when a move is refused', async () => {
    await open();
    await choose('sprint', 's1');

    http.expectOne(`${ITEM_URL}/sprint`).flush(
      { code: 'PROJECT_SERVICE_UNAVAILABLE', message: 'x' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(control<HTMLSelectElement>('sprint').value).toBe('');
    expect(messages()[0][1]).toContain('no está disponible');
    (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem());
    await settle();
  });

  it('edits the fields and saves them', async () => {
    await open();
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Editar')!.click();
    fixture.detectChanges();

    const title = control<HTMLInputElement>('edit-title');
    expect(title.value).toBe('Pay by card');
    title.value = 'Pay by card or wallet';
    title.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    root().querySelector('form')!.dispatchEvent(new Event('submit'));

    const request = await vi.waitFor(() => http.expectOne(ITEM_URL));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ title: 'Pay by card or wallet', priority: 'MEDIUM', effortPoints: 5 });
    request.flush(workItem({ title: 'Pay by card or wallet' }));
    await settle();

    expect(root().querySelector('h1')?.textContent).toBe('Pay by card or wallet');
    expect(root().querySelector('app-work-item-edit')).toBeNull();
    expect(messages()).toEqual([['success', 'Cambios guardados.']]);
  });

  it('asks before deleting, then deletes and returns to the list', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await open();
    const button = (label: string) =>
      [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;

    button('Eliminar').click();
    fixture.detectChanges();
    expect(root().querySelector('[role="alertdialog"]')?.textContent).toContain('¿Eliminar WAR-1000?');
    http.expectNone(ITEM_URL);

    button('Sí, eliminar').click();
    const request = http.expectOne(ITEM_URL);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/work-items'], { queryParams: { project: 'project-1' } });
    expect(messages()).toEqual([['success', 'WAR-1000 se eliminó.']]);
  });

  it('shows the links section and reloads the item when a link changes', async () => {
    await open(
      workItem({
        links: [{ linkCode: 'link-1', type: 'BLOCKS', item: { workItemCode: 'item-9', workItemNumber: 1009, displayKey: 'WAR-1009', type: 'TASK', title: 'Ship it', status: NEW_STATUS } }],
      }),
    );

    expect(root().textContent).toContain('Bloquea a');
    expect(root().querySelector('a[href="/work-items/item-9"]')?.textContent).toContain('WAR-1009');

    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith('Quitar'))!.click();
    const remove = http.expectOne(`${ITEM_URL}/links/link-1`);
    remove.flush(null, { status: 204, statusText: 'No Content' });

    (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem({ links: [] }));
    await settle();
    expect(root().textContent).toContain('Sin relaciones.');
  });

  it('says so when the item cannot be found', async () => {
    fixture = TestBed.createComponent(WorkItemDetail);
    fixture.detectChanges();
    http.expectOne(ITEM_URL).flush(
      { code: 'WORK_ITEM_NOT_FOUND', message: 'Not found' },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
  });


  describe('live updates', () => {
    const remoteMove = (overrides: object = {}) => ({
      workItemCode: 'item-1',
      displayKey: 'WAR-1000',
      status: APPROVED_STATUS,
      allowedStatuses: [],
      changedBy: { userCode: 'u-2', fullName: 'Luis Lopez' },
      updatedAt: '2026-01-05T11:00:00Z',
      ...overrides,
    });

    const button = (label: string) =>
      [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;

    it("follows the live board of the item's project and shows where the connection stands", async () => {
      await open();

      expect(board.connect).toHaveBeenCalledWith('project-1');
      expect(root().querySelector('app-board-connection [role="status"]')?.textContent).toContain('Conectado en vivo');
    });

    it('tells who changed the status and reloads the item when someone else does', async () => {
      await open();

      board.statusChanged$.next(remoteMove());
      fixture.detectChanges();

      expect(messages()).toEqual([['info', 'Luis Lopez cambió el estado de WAR-1000 a Approved.']]);
      (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem({ status: APPROVED_STATUS, allowedStatuses: [] }));
      await settle();
      expect(root().textContent).toContain('Approved');
      expect(root().textContent).toContain('Sin más estados');
    });

    it('treats a card dropped on the board like any other status change', async () => {
      await open();

      board.itemMoved$.next({ ...remoteMove(), fromStatus: 'NEW', movedBy: { userCode: 'u-2', fullName: 'Luis Lopez' } });

      fixture.detectChanges();

      expect(messages()).toEqual([['info', 'Luis Lopez cambió el estado de WAR-1000 a Approved.']]);
      (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem({ status: APPROVED_STATUS }));
    });

    it('ignores the echo of a change already on screen, and changes of other items', async () => {
      await open();

      board.statusChanged$.next(remoteMove({ status: NEW_STATUS }));
      board.statusChanged$.next(remoteMove({ workItemCode: 'item-2' }));
      board.itemMoved$.next({ ...remoteMove({ workItemCode: 'item-2' }), fromStatus: 'NEW' });

      expect(messages()).toEqual([]);
      http.expectNone(ITEM_URL);
    });

    it('holds the reload until the edit is over, so nobody loses what they were typing', async () => {
      await open();
      button('Editar').click();
      fixture.detectChanges();
      const title = control<HTMLInputElement>('edit-title');
      title.value = 'Half-written';
      title.dispatchEvent(new Event('input'));

      board.statusChanged$.next(remoteMove());
      fixture.detectChanges();

      expect(messages()).toEqual([['info', 'Luis Lopez cambió el estado de WAR-1000 a Approved. Lo verás al terminar de editar.']]);
      http.expectNone(ITEM_URL);
      expect(control<HTMLInputElement>('edit-title').value).toBe('Half-written');

      button('Cancelar').click();
      fixture.detectChanges();

      (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem({ status: APPROVED_STATUS }));
      await settle();
      expect(root().textContent).toContain('Approved');
    });

    it('reloads when the board asks for it: the connection is down, or has just come back', async () => {
      await open();

      board.refresh$.next();
      fixture.detectChanges();

      (await vi.waitFor(() => http.expectOne(ITEM_URL))).flush(workItem({ title: 'Renamed elsewhere' }));
      // the comments of the page are reloaded too
      http.expectOne(`${ITEM_URL}/comments`).flush([]);
      await settle();
      expect(root().querySelector('h1')?.textContent).toBe('Renamed elsewhere');
    });

    it('lets go of the board when the page closes', async () => {
      await open();

      fixture.destroy();

      expect(board.release).toHaveBeenCalled();
    });
  });

  it('has no accessibility violations in view, edit and delete-confirmation states', async () => {
    await open(
      workItem({
        description: 'Details',
        acceptanceCriteria: 'It works',
        assignees: [{ assignmentCode: 'a1', userCode: 'u1', fullName: 'Mia Member', role: 'DEV' }],
        children: [
          { workItemCode: 'c1', workItemNumber: 1001, displayKey: 'WAR-1001', type: 'TASK', title: 'Child', status: NEW_STATUS },
        ],
      }),
    );
    await expectNoAxeViolations(root());

    const button = (label: string) =>
      [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;
    button('Eliminar').click();
    fixture.detectChanges();
    await expectNoAxeViolations(root());

    button('Conservar').click();
    button('Editar').click();
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
