import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FakeBoard, provideFakeBoard } from '../../../board/board.testing';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ChangeType, HistoryEntry } from '../../models/work-item.models';
import { WorkItemHistory } from './work-item-history';

const URL = `${environment.apiUrl}/api/work-items/item-1/history`;

const entry = (changeType: ChangeType, rest: Partial<HistoryEntry> = {}): HistoryEntry => ({
  changeType,
  additionalData: {},
  changedBy: { userCode: 'u1', fullName: 'Mia Member' },
  createdAt: '2026-09-25T10:00:00Z',
  ...rest,
});

const page = (items: HistoryEntry[], total = items.length, number = 0) => ({ items, total, page: number, size: 20 });

describe('WorkItemHistory', () => {
  let fixture: ComponentFixture<WorkItemHistory>;
  let http: HttpTestingController;
  let board: FakeBoard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemHistory],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideFakeBoard()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    board = TestBed.inject(BoardWebSocketService) as unknown as FakeBoard;
    fixture = TestBed.createComponent(WorkItemHistory);
    fixture.componentRef.setInput('workItemCode', 'item-1');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const toggle = () => root().querySelector<HTMLButtonElement>('button[aria-controls="history-content"]')!;
  const content = () => root().querySelector<HTMLElement>('#history-content')!;
  const rows = () => [...root().querySelectorAll('li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
  const request = (pageNumber: number) =>
    http.expectOne((r) => r.url === URL && r.params.get('page') === String(pageNumber) && r.params.get('size') === '20');

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Opens the history and answers the first page. */
  async function open(first: ReturnType<typeof page>): Promise<void> {
    toggle().click();
    fixture.detectChanges();
    (await vi.waitFor(() => request(0))).flush(first);
    await settle();
  }

  it('is closed and has asked for nothing until somebody opens it', () => {
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toContain('Mostrar historial');
    expect(content().hidden).toBe(true);
    http.expectNone(URL);
  });

  it('opens on request, shows the changes newest first, and closes again', async () => {
    await open(
      page([
        entry('COMMENTED', { newValue: 'Looks good', createdAt: '2026-09-25T11:00:00Z' }),
        entry('STATE_CHANGED', { oldValue: 'NEW', newValue: 'APPROVED', additionalData: { from: 'Nuevo', to: 'Aprobado' } }),
        entry('CREATED', { additionalData: { type: 'PBI' } }),
      ]),
    );

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().textContent).toContain('Ocultar historial');
    expect(content().hidden).toBe(false);
    const listed = rows();
    expect(listed).toHaveLength(3);
    expect(listed[0]).toContain('Mia Member comentó');
    expect(listed[0]).toContain('Looks good');
    expect(listed[1]).toContain('cambió el estado de «Nuevo» a «Aprobado»');
    expect(listed[2]).toContain('creó este elemento');
    expect(root().textContent).toContain('Mostrando 3 de 3 cambios');
    expect(root().textContent).not.toContain('Mostrar más');

    toggle().click();
    fixture.detectChanges();
    expect(content().hidden).toBe(true);
  });

  it('says so when nothing was recorded', async () => {
    await open(page([]));

    expect(root().textContent).toContain('Este elemento aún no tiene cambios registrados.');
  });

  it('shows the next page below the first on request', async () => {
    await open(page([entry('COMMENTED', { newValue: 'Newest' })], 2));
    expect(root().textContent).toContain('Mostrando 1 de 2 cambios');

    [...root().querySelectorAll('button')].find((b) => b.textContent?.includes('Mostrar más'))!.click();
    fixture.detectChanges();
    (await vi.waitFor(() => request(1))).flush(page([entry('CREATED')], 2, 1));
    await settle();

    expect(rows()).toHaveLength(2);
    expect(rows()[1]).toContain('creó este elemento');
    expect(root().textContent).toContain('Mostrando 2 de 2 cambios');
    expect(root().textContent).not.toContain('Mostrar más');
  });

  it('says it could not load, keeps what is shown, and tries again on request', async () => {
    toggle().click();
    fixture.detectChanges();
    (await vi.waitFor(() => request(0))).flush('', { status: 500, statusText: 'Server Error' });
    await settle();
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el historial.');

    root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    (await vi.waitFor(() => request(0))).flush(page([entry('CREATED')]));
    await settle();

    expect(root().querySelector('[role="alert"]')).toBeNull();
    expect(rows()).toHaveLength(1);
  });

  describe('while it is open it follows the item', () => {
    beforeEach(() => open(page([entry('CREATED')])));

    it('fetches again when the page changed the item', async () => {
      fixture.componentRef.setInput('version', 1);
      fixture.detectChanges();
      (await vi.waitFor(() => request(0))).flush(page([entry('COMMENTED', { newValue: 'New' }), entry('CREATED')]));
      await settle();

      expect(rows()).toHaveLength(2);
    });

    it('fetches again when somebody else changes this item, but not another one', async () => {
      board.commentAdded$.next({ workItemCode: 'other' } as never);
      http.expectNone(URL);

      board.commentAdded$.next({ workItemCode: 'item-1' } as never);
      (await vi.waitFor(() => request(0))).flush(page([entry('COMMENTED'), entry('CREATED')]));
      await settle();
      expect(rows()).toHaveLength(2);

      board.statusChanged$.next({ workItemCode: 'item-1' } as never);
      (await vi.waitFor(() => request(0))).flush(page([entry('STATE_CHANGED'), entry('COMMENTED'), entry('CREATED')]));
      await settle();
      expect(rows()).toHaveLength(3);
    });

    it('fetches again when the board asks for a refresh after a lost connection', async () => {
      board.refresh$.next();

      (await vi.waitFor(() => request(0))).flush(page([entry('CREATED')]));
    });

    it('keeps every page that is on screen when it refreshes', async () => {
      fixture.destroy();
      fixture = TestBed.createComponent(WorkItemHistory);
      fixture.componentRef.setInput('workItemCode', 'item-1');
      fixture.detectChanges();
      await open(page([entry('COMMENTED', { newValue: 'Newest' })], 2));
      [...root().querySelectorAll('button')].find((b) => b.textContent?.includes('Mostrar más'))!.click();
      fixture.detectChanges();
      (await vi.waitFor(() => request(1))).flush(page([entry('CREATED')], 2, 1));
      await settle();

      board.refresh$.next();
      const first = await vi.waitFor(() => request(0));
      const second = await vi.waitFor(() => request(1));
      first.flush(page([entry('STATE_CHANGED'), entry('COMMENTED')], 3));
      second.flush(page([entry('CREATED')], 3, 1));
      await settle();

      expect(rows()).toHaveLength(3);
    });
  });

  it('starts over when it is shown for another item', async () => {
    await open(page([entry('CREATED')]));

    fixture.componentRef.setInput('workItemCode', 'item-2');
    fixture.detectChanges();
    const other = await vi.waitFor(() => http.expectOne((r) => r.url === `${environment.apiUrl}/api/work-items/item-2/history`));
    expect(rows()).toHaveLength(0);
    other.flush(page([entry('DELETED')]));
    await settle();

    expect(rows()[0]).toContain('eliminó este elemento');
  });

  it('has no accessibility violations, closed or open, with every kind of entry', async () => {
    await expectNoAxeViolations(root());

    await open(
      page([
        entry('COMMENTED', { newValue: 'Looks good' }),
        entry('DESCRIPTION_EDITED', { field: 'Description', oldValue: 'Before', newValue: 'After' }),
        entry('LINKED', { additionalData: { targetCode: 'item-2', targetKey: 'WAR-1001', type: 'BLOCKS' } }),
        entry('SPRINT_CHANGED', { newValue: 's1', additionalData: { sprint: 'Sprint 1' } }),
        entry('CREATED'),
      ]),
    );

    await expectNoAxeViolations(root());
  });
});
