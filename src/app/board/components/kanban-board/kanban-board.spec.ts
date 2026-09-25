import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { Sprint } from '../../../projects/models/project.models';
import { sprint } from '../../../projects/projects.testing';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { WorkItemSummary } from '../../../work-items/models/work-item.models';
import { Workflow } from '../../../work-items/services/work-item.service';
import { summary, workItem } from '../../../work-items/work-items.testing';
import { FakeBoard, provideFakeBoard } from '../../board.testing';
import { ItemMovedEvent } from '../../models/board.models';
import { BoardWebSocketService } from '../../services/board-websocket.service';
import { BOARD_PAGE_SIZE, KanbanBoard, MOVE_TIMEOUT_MS } from './kanban-board';

const API = environment.apiUrl;
const ITEMS_URL = `${API}/api/work-items`;

const PROJECTS = [
  { projectCode: 'p1', name: 'Web App Rewrite', key: 'WAR' },
  { projectCode: 'p2', name: 'Mobile', key: 'MOB' },
];

const SPRINTS: Sprint[] = [
  sprint({ sprintCode: 's0', projectCode: 'p1', name: 'Sprint 0', status: 'CLOSED', startDate: '2026-01-01', endDate: '2026-01-14' }),
  sprint({ sprintCode: 's1', projectCode: 'p1', name: 'Sprint 1', status: 'ACTIVE', startDate: '2026-01-15', endDate: '2026-01-28' }),
  sprint({ sprintCode: 's2', projectCode: 'p1', name: 'Sprint 2', status: 'PLANNED', startDate: '2026-01-29', endDate: '2026-02-11' }),
];

/** New → Approved → Done. Approved → New is not allowed back; Done → Approved is. */
const WORKFLOW: Workflow = {
  itemType: 'PBI',
  statuses: [
    { code: 'DONE', displayName: 'Done', order: 3, isTerminal: true },
    { code: 'NEW', displayName: 'New', order: 1, isTerminal: false },
    { code: 'APPROVED', displayName: 'Approved', order: 2, isTerminal: false },
  ],
  transitions: [
    { from: 'NEW', to: 'APPROVED', allowedBackward: false },
    { from: 'APPROVED', to: 'DONE', allowedBackward: true },
  ],
};

/** Only someone assigned as QA (or an owner/admin) may approve. */
const APPROVAL_NEEDS_QA: Workflow = {
  ...WORKFLOW,
  transitions: [{ from: 'NEW', to: 'APPROVED', allowedBackward: false, requiredRole: 'QA' }, WORKFLOW.transitions[1]],
};

const STATUS = {
  NEW: { code: 'NEW', displayName: 'New', isInitial: true, isTerminal: false },
  APPROVED: { code: 'APPROVED', displayName: 'Approved', isInitial: false, isTerminal: false },
  DONE: { code: 'DONE', displayName: 'Done', isInitial: false, isTerminal: true },
};

const CARDS: WorkItemSummary[] = [
  summary({ workItemCode: 'item-2', workItemNumber: 1001, displayKey: 'WAR-1001', title: 'Refund', status: STATUS.APPROVED }),
  summary({ workItemCode: 'item-1', workItemNumber: 1000, displayKey: 'WAR-1000', title: 'Pay by card' }),
  summary({ workItemCode: 'item-3', workItemNumber: 1002, displayKey: 'WAR-1002', title: 'Receipts', status: STATUS.DONE }),
];

/** Three medium cards ranked a, b, c, and a critical one that comes first whatever the ranks say. */
const RANKED: WorkItemSummary[] = [
  summary({ workItemCode: 'a', workItemNumber: 1000, displayKey: 'WAR-1000', title: 'Alpha', boardRank: 1 }),
  summary({ workItemCode: 'b', workItemNumber: 1001, displayKey: 'WAR-1001', title: 'Bravo', boardRank: 2 }),
  summary({ workItemCode: 'c', workItemNumber: 1002, displayKey: 'WAR-1002', title: 'Charlie', boardRank: 3 }),
  summary({ workItemCode: 'crit', workItemNumber: 1003, displayKey: 'WAR-1003', title: 'Urgent', priority: 'CRITICAL' }),
];

type Columns = Record<'New' | 'Approved' | 'Done', string[]>;

describe('KanbanBoard', () => {
  let fixture: ComponentFixture<KanbanBoard>;
  let http: HttpTestingController;
  let router: Router;
  let board: FakeBoard;
  let auth: FakeAuth;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanBoard],
      providers: [
        provideRouter([{ path: 'board', component: KanbanBoard }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFakeBoard(),
        provideFakeAuth(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    board = TestBed.inject(BoardWebSocketService) as unknown as FakeBoard;
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const itemsRequest = () => vi.waitFor(() => http.expectOne((req) => req.url === ITEMS_URL));
  const flushItems = async (items: WorkItemSummary[], total = items.length) =>
    (await itemsRequest()).flush({ items, total, page: 0, size: BOARD_PAGE_SIZE });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Opens the board and answers what it asks for on the way in. */
  async function open(
    options: { url?: string; items?: WorkItemSummary[]; total?: number; workflow?: Workflow; sprints?: Sprint[] } = {},
  ): Promise<void> {
    await router.navigateByUrl(options.url ?? '/board');
    fixture = TestBed.createComponent(KanbanBoard);
    fixture.detectChanges();
    http.expectOne(`${API}/api/projects`).flush(PROJECTS);
    fixture.detectChanges();
    (await vi.waitFor(() => http.expectOne(`${API}/api/sprints?projectCode=p1`))).flush(options.sprints ?? SPRINTS);
    http.expectOne(`${API}/api/status-workflows/PBI`).flush(options.workflow ?? WORKFLOW);
    fixture.detectChanges();
    const items = options.items ?? CARDS;
    await flushItems(items, options.total);
    await settle();
  }

  /** The keys of the cards in each column, by column name. */
  function columns(): Columns {
    return Object.fromEntries(
      [...root().querySelectorAll('section')].map((section) => [
        section.querySelector('h2 app-status-label')!.textContent!.trim(),
        [...section.querySelectorAll('article > div a')].map((link) => link.textContent!.trim()),
      ]),
    ) as Columns;
  }

  const moveList = (key: string) => root().querySelector<HTMLSelectElement>(`select[aria-label="Mover ${key} a"]`)!;
  const optionsOf = (select: HTMLSelectElement) => [...select.options].map((option) => option.textContent!.replace(/\s+/g, ' ').trim());
  const button = (label: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label') === label)!;
  const dropLists = () => fixture.debugElement.queryAll(By.directive(CdkDropList));

  function chooseMove(key: string, status: string): void {
    const select = moveList(key);
    select.value = status;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function choose(id: string, value: string): void {
    const select = root().querySelector<HTMLSelectElement>(`#${id}`)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  const echo = (status = STATUS.APPROVED, extra: Partial<ItemMovedEvent> = {}): ItemMovedEvent => ({
    workItemCode: 'item-1',
    displayKey: 'WAR-1000',
    fromStatus: 'NEW',
    status,
    allowedStatuses: [],
    movedBy: { userCode: 'u-me', fullName: 'Yo Mismo' },
    updatedAt: '2026-01-06T10:00:00Z',
    ...extra,
  });

  describe('what it shows', () => {
    it('has a column per status of the type, in workflow order, with how many cards and points each holds', async () => {
      await open();

      expect(Object.keys(columns())).toEqual(['New', 'Approved', 'Done']);
      expect(columns()).toEqual({ New: ['WAR-1000'], Approved: ['WAR-1001'], Done: ['WAR-1002'] });
      expect([...root().querySelectorAll('section h2')].map((h) => h.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
        'New 1 · 5 pts',
        'Approved 1 · 5 pts',
        'Done 1 · 5 pts',
      ]);
      expect(root().querySelector('h1')?.textContent).toBe('Tablero');
    });

    it('shows on every card its key, title, priority in words, points and who works on it', async () => {
      await open({
        items: [
          summary({
            title: 'Pay by card',
            priority: 'HIGH',
            effortPoints: 8,
            assignees: [
              { assignmentCode: 'as-1', userCode: 'u-2', fullName: 'Luis Lopez', role: 'DEV' },
              { assignmentCode: 'as-2', userCode: 'u-3', fullName: 'Ana Diaz', role: 'QA' },
            ],
          }),
          summary({ workItemCode: 'item-2', workItemNumber: 1001, displayKey: 'WAR-1001' }),
        ],
      });

      const [first, second] = [...root().querySelectorAll('article')].map((card) => card.textContent!.replace(/\s+/g, ' '));
      expect(first).toContain('WAR-1000');
      expect(first).toContain('Pay by card');
      expect(first).toContain('Prioridad: Alta');
      expect(first).toContain('8 pts');
      expect(first).toContain('Asignados: Luis Lopez (Desarrollo), Ana Diaz (Calidad (QA))');
      expect(second).toContain('Asignados: Sin asignar');
      expect(root().querySelector('article a')?.getAttribute('href')).toBe('/work-items/item-1');
    });

    it("orders a column by priority first, then by the manual rank, then by number", async () => {
      await open({
        items: [
          ...RANKED,
          summary({ workItemCode: 'd', workItemNumber: 1004, displayKey: 'WAR-1004' }), // never ranked: after the ranked ones
          summary({ workItemCode: 'low', workItemNumber: 900, displayKey: 'WAR-0900', priority: 'LOW', boardRank: 1 }),
        ],
      });

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1000', 'WAR-1001', 'WAR-1002', 'WAR-1004', 'WAR-0900']);
    });

    it('shows one type at a time: PBI unless the URL names another, and asks for that type only', async () => {
      await router.navigateByUrl('/board?project=p1&type=TASK');
      fixture = TestBed.createComponent(KanbanBoard);
      fixture.detectChanges();
      http.expectOne(`${API}/api/projects`).flush(PROJECTS);
      fixture.detectChanges();
      (await vi.waitFor(() => http.expectOne(`${API}/api/sprints?projectCode=p1`))).flush([]);
      http.expectOne(`${API}/api/status-workflows/TASK`).flush({ ...WORKFLOW, itemType: 'TASK' });
      fixture.detectChanges();

      const request = await itemsRequest();
      expect(request.request.params.get('projectCode')).toBe('p1');
      expect(request.request.params.get('type')).toBe('TASK');
      expect(request.request.params.get('sort')).toBe('board');
      expect(request.request.params.get('size')).toBe(String(BOARD_PAGE_SIZE));
      request.flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
      await settle();

      expect(root().querySelectorAll('section ul > li').length).toBe(3); // an empty column says so
      expect(root().textContent).toContain('Sin elementos');
    });

    it('opens the live board of its project', async () => {
      await open();

      expect(board.connect).toHaveBeenCalledWith('p1');
    });

    it('says when there are more items than the board loads', async () => {
      await open({ total: BOARD_PAGE_SIZE + 12 });

      expect(root().textContent).toContain(`primeros ${BOARD_PAGE_SIZE} elementos; hay 12 más`);
    });

    it('reloads when the board asks for it: the connection is down, or has just come back', async () => {
      await open();
      vi.useFakeTimers();

      board.refresh$.next();
      vi.advanceTimersByTime(600);

      http.expectOne((req) => req.url === ITEMS_URL).flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
    });

    it('is free of accessibility violations', async () => {
      await open({
        items: [
          summary({ assignees: [{ assignmentCode: 'as-1', userCode: 'u-2', fullName: 'Luis Lopez', role: 'DEV' }], childCount: 2 }),
          ...CARDS.slice(0, 2),
        ],
      });

      await expectNoAxeViolations(root());
    });

    it('is free of accessibility violations for a member, with a card that needs a role', async () => {
      auth.becomes('MEMBER');
      await open({ workflow: APPROVAL_NEEDS_QA });

      await expectNoAxeViolations(root());
    });
  });

  describe('sprints', () => {
    it('shows the current sprint by default, and asks for its items only', async () => {
      await router.navigateByUrl('/board');
      fixture = TestBed.createComponent(KanbanBoard);
      fixture.detectChanges();
      http.expectOne(`${API}/api/projects`).flush(PROJECTS);
      fixture.detectChanges();
      (await vi.waitFor(() => http.expectOne(`${API}/api/sprints?projectCode=p1`))).flush(SPRINTS);
      http.expectOne(`${API}/api/status-workflows/PBI`).flush(WORKFLOW);
      fixture.detectChanges();

      const request = await itemsRequest(); // one request, made once the sprints are known: no flash of every sprint's items
      expect(request.request.params.get('sprintCode')).toBe('s1');
      request.flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
      await settle();

      const pressed = [...root().querySelectorAll('app-sprint-filter button[aria-pressed="true"]')].map((b) => b.textContent!.trim());
      expect(pressed).toEqual([expect.stringContaining('Sprint 1')]);
    });

    it('shows every sprint when none is current', async () => {
      await router.navigateByUrl('/board');
      fixture = TestBed.createComponent(KanbanBoard);
      fixture.detectChanges();
      http.expectOne(`${API}/api/projects`).flush(PROJECTS);
      fixture.detectChanges();
      (await vi.waitFor(() => http.expectOne(`${API}/api/sprints?projectCode=p1`))).flush([SPRINTS[0]]);
      http.expectOne(`${API}/api/status-workflows/PBI`).flush(WORKFLOW);
      fixture.detectChanges();

      const request = await itemsRequest();
      expect(request.request.params.has('sprintCode')).toBe(false);
      expect(request.request.params.has('backlog')).toBe(false);
      request.flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
    });

    it('follows the sprint in the URL, the backlog, and everything', async () => {
      await router.navigateByUrl('/board?sprint=backlog');
      fixture = TestBed.createComponent(KanbanBoard);
      fixture.detectChanges();
      http.expectOne(`${API}/api/projects`).flush(PROJECTS);
      fixture.detectChanges();
      (await vi.waitFor(() => http.expectOne(`${API}/api/sprints?projectCode=p1`))).flush(SPRINTS);
      http.expectOne(`${API}/api/status-workflows/PBI`).flush(WORKFLOW);
      fixture.detectChanges();

      const request = await itemsRequest();
      expect(request.request.params.get('backlog')).toBe('true');
      expect(request.request.params.has('sprintCode')).toBe(false);
      request.flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
    });

    it('reloads the board for the sprint that is picked', async () => {
      await open();

      root().querySelector<HTMLButtonElement>('app-sprint-filter button:not([aria-pressed="true"])')!.click();
      await vi.waitFor(() => expect(router.parseUrl(router.url).queryParams['sprint']).toBeDefined());
      fixture.detectChanges();

      const picked = router.parseUrl(router.url).queryParams['sprint'];
      const request = await itemsRequest();
      if (picked === 'all') {
        expect(request.request.params.has('sprintCode')).toBe(false);
      } else if (picked === 'backlog') {
        expect(request.request.params.get('backlog')).toBe('true');
      } else {
        expect(request.request.params.get('sprintCode')).toBe(picked);
      }
      request.flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
    });

    it('says which sprint each card is in when more than one sprint is shown', async () => {
      await open({
        url: '/board?sprint=all',
        items: [summary({ sprintCode: 's1' }), summary({ workItemCode: 'item-2', workItemNumber: 1001, displayKey: 'WAR-1001' })],
      });

      const [first, second] = [...root().querySelectorAll('article')].map((card) => card.textContent!.replace(/\s+/g, ' '));
      expect(first).toContain('5 pts · Sprint 1');
      expect(second).toContain('5 pts · Backlog');
    });
  });

  describe('filters', () => {
    const people = [
      { assignmentCode: 'as-1', userCode: 'u-2', fullName: 'Luis Lopez', role: 'DEV' as const },
      { assignmentCode: 'as-2', userCode: 'u-3', fullName: 'Ana Diaz', role: 'QA' as const },
    ];
    const FILTERABLE = [
      summary({ workItemCode: 'a', workItemNumber: 1000, displayKey: 'WAR-1000', title: 'Login page', priority: 'HIGH', assignees: [people[0]] }),
      summary({ workItemCode: 'b', workItemNumber: 1001, displayKey: 'WAR-1001', title: 'Refund flow', assignees: [people[1]] }),
      summary({ workItemCode: 'c', workItemNumber: 1002, displayKey: 'WAR-1002', title: 'Receipts' }),
    ];

    it('filters by priority', async () => {
      await open({ items: FILTERABLE });

      choose('priority', 'HIGH');
      await vi.waitFor(() => expect(router.parseUrl(router.url).queryParams['priority']).toBe('HIGH'));
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1000']);
      http.expectNone((req) => req.url === ITEMS_URL); // it hides cards; it does not ask again
    });

    it('filters by who works on it, offering everyone on the board, and those nobody works on', async () => {
      await open({ items: FILTERABLE });
      const options = [...root().querySelectorAll<HTMLOptionElement>('#assignee option')].map((o) => o.textContent!.trim());
      expect(options).toEqual(['Todos', 'Sin asignar', 'Ana Diaz', 'Luis Lopez']);

      choose('assignee', 'u-3');
      await vi.waitFor(() => expect(router.parseUrl(router.url).queryParams['assignee']).toBe('u-3'));
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1001']);

      choose('assignee', 'none');
      await vi.waitFor(() => expect(router.parseUrl(router.url).queryParams['assignee']).toBe('none'));
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1002']);
    });

    it('searches key, title and people as you type, and takes the filters off again', async () => {
      await open({ items: FILTERABLE });
      const input = root().querySelector<HTMLInputElement>('#board-search')!;

      input.value = 'refund';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1001']);

      input.value = 'luis';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1000']);

      input.value = 'war-1002';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1002']);

      [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Quitar filtros')!.click();
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1000', 'WAR-1001', 'WAR-1002']);
      expect(input.value).toBe('');
    });

    it('counts only the cards that are shown', async () => {
      await open({ items: FILTERABLE });
      const input = root().querySelector<HTMLInputElement>('#board-search')!;

      input.value = 'refund';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(root().querySelector('section h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('New 1 · 5 pts');
    });
  });

  describe('the tree of children', () => {
    const CHILD = summary({
      workItemCode: 'task-1',
      workItemNumber: 1010,
      displayKey: 'WAR-1010',
      type: 'TASK',
      title: 'Call the gateway',
      parentCode: 'item-1',
      childCount: 1,
      status: STATUS.NEW,
      assignees: [{ assignmentCode: 'as-1', userCode: 'u-2', fullName: 'Luis Lopez', role: 'DEV' }],
    });
    const GRANDCHILD = summary({ workItemCode: 'sub-1', workItemNumber: 1011, displayKey: 'WAR-1011', type: 'TASK', title: 'Retry on timeout', parentCode: 'task-1' });

    const toggle = () => root().querySelector<HTMLButtonElement>('button[aria-expanded]')!;

    it('is collapsed until it is opened, and says how many children the card has', async () => {
      await open({ items: [summary({ childCount: 3 })] });

      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().textContent).toContain('Mostrar 3 elementos secundarios');
      expect(root().querySelector('app-card-children')).toBeNull();
      http.expectNone((req) => req.url === ITEMS_URL);
    });

    it('loads the children when opened, and each child can be opened in turn', async () => {
      await open({ items: [summary({ childCount: 1 })] });

      toggle().click();
      fixture.detectChanges();
      const request = await itemsRequest();
      expect(request.request.params.get('parentCode')).toBe('item-1');
      request.flush({ items: [CHILD], total: 1, page: 0, size: 200 });
      await settle();

      const tree = root().querySelector('app-card-children')!;
      expect(tree.textContent).toContain('WAR-1010');
      expect(tree.textContent).toContain('Tarea');
      expect(tree.textContent).toContain('Call the gateway');
      expect(tree.textContent).toContain('Luis Lopez (Desarrollo)');
      expect(toggle().getAttribute('aria-expanded')).toBe('true');

      tree.querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
      fixture.detectChanges();
      const grandchildren = await itemsRequest();
      expect(grandchildren.request.params.get('parentCode')).toBe('task-1');
      grandchildren.flush({ items: [GRANDCHILD], total: 1, page: 0, size: 200 });
      await settle();
      expect(root().querySelectorAll('app-card-children')).toHaveLength(2);
      expect(root().textContent).toContain('Retry on timeout');
    });

    it('closes again, and follows the status of its children on the live board', async () => {
      await open({ items: [summary({ childCount: 1 })] });
      toggle().click();
      fixture.detectChanges();
      (await itemsRequest()).flush({ items: [CHILD], total: 1, page: 0, size: 200 });
      await settle();

      board.statusChanged$.next({
        workItemCode: 'task-1',
        displayKey: 'WAR-1010',
        status: STATUS.DONE,
        allowedStatuses: [],
        updatedAt: '2026-01-06T10:00:00Z',
      });
      fixture.detectChanges();
      expect(root().querySelector('app-card-children')!.textContent).toContain('Done');

      toggle().click();
      fixture.detectChanges();
      expect(root().querySelector('app-card-children')).toBeNull();
    });

    it('is free of accessibility violations, open', async () => {
      await open({ items: [summary({ childCount: 1 })] });
      toggle().click();
      fixture.detectChanges();
      (await itemsRequest()).flush({ items: [CHILD], total: 1, page: 0, size: 200 });
      await settle();

      await expectNoAxeViolations(root());
    });
  });

  describe('which moves are offered', () => {
    it('lists only what the workflow allows: forward, and back where the transition says so', async () => {
      await open();

      expect(optionsOf(moveList('WAR-1000'))).toEqual(['Mover a…', 'Approved']);
      expect(optionsOf(moveList('WAR-1001'))).toEqual(['Mover a…', 'Done']); // Approved → New is not allowed back
      expect(optionsOf(moveList('WAR-1002'))).toEqual(['Mover a…', 'Approved']);
    });

    it('refuses a drop the workflow does not allow, and lets a card stay where it is', async () => {
      await open();
      const [newList, , doneList] = dropLists().map((debug) => debug.injector.get(CdkDropList));
      const card = { data: CARDS[1] } as never; // WAR-1000, in New

      expect(newList.enterPredicate(card, newList)).toBe(true);
      expect(doneList.enterPredicate(card, doneList)).toBe(false);
    });

    it('registers the card as the drag handle of its row, so the select and the links stay clickable', async () => {
      await open();

      const handle = root().querySelector('[cdkdraghandle]')!;
      expect(handle).not.toBeNull();
      expect(handle.closest('article')).not.toBeNull();
      expect(handle.querySelector('select')).toBeNull();
      // the handle is in the card's own template: CDK must still have found it as the handle of the row's drag
      const drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag) as unknown as {
        _dragRef: { _handles: HTMLElement[] };
      };
      expect(drag._dragRef._handles).toEqual([handle]);
    });
  });

  describe('a move that needs a role', () => {
    beforeEach(() => auth.becomes('MEMBER', 'u-member'));

    it('is shown but disabled for a member who is not assigned in that role, with the reason', async () => {
      await open({ workflow: APPROVAL_NEEDS_QA });

      const select = moveList('WAR-1000');
      expect(select.disabled).toBe(true);
      expect(optionsOf(select)).toEqual(['Mover a…', 'Approved (requiere rol: Calidad (QA))']);
      expect(select.options[1].disabled).toBe(true);
      expect(root().textContent).toContain('Solo alguien asignado como Calidad (QA) o un administrador puede mover esta tarjeta.');
      expect(moveList('WAR-1001').disabled).toBe(false); // an unrestricted move is theirs
    });

    it('is refused as a drop, and does nothing when forced', async () => {
      await open({ workflow: APPROVAL_NEEDS_QA });
      const lists = dropLists();
      const [newList, approvedList] = lists.map((debug) => debug.injector.get(CdkDropList));

      expect(approvedList.enterPredicate({ data: CARDS[1] } as never, approvedList)).toBe(false);
      lists[1].triggerEventHandler('cdkDropListDropped', { previousContainer: newList, container: approvedList, item: { data: CARDS[1] } });

      expect(board.moveItem).not.toHaveBeenCalled();
      expect(columns().New).toEqual(['WAR-1000']);
    });

    it('is theirs when they are assigned to the card in that role', async () => {
      const assigned = summary({ assignees: [{ assignmentCode: 'as-1', userCode: 'u-member', fullName: 'Yo', role: 'QA' }] });
      await open({ workflow: APPROVAL_NEEDS_QA, items: [assigned] });

      expect(moveList('WAR-1000').disabled).toBe(false);
      expect(moveList('WAR-1000').options[1].disabled).toBe(false);
      chooseMove('WAR-1000', 'APPROVED');
      expect(board.moveItem).toHaveBeenCalledWith('item-1', 'APPROVED');
    });

    it('is not theirs when they are assigned in another role', async () => {
      const assigned = summary({ assignees: [{ assignmentCode: 'as-1', userCode: 'u-member', fullName: 'Yo', role: 'DEV' }] });
      await open({ workflow: APPROVAL_NEEDS_QA, items: [assigned] });

      expect(moveList('WAR-1000').disabled).toBe(true);
    });

    it('is always available to an owner or admin', async () => {
      auth.becomes('ADMIN');
      await open({ workflow: APPROVAL_NEEDS_QA });

      expect(moveList('WAR-1000').disabled).toBe(false);
      expect(moveList('WAR-1000').options[1].disabled).toBe(false);
    });
  });

  describe('moving a card', () => {
    it('shows the move at once and keeps it when the server confirms it over the live connection', async () => {
      await open();

      chooseMove('WAR-1000', 'APPROVED');

      expect(columns()).toEqual({ New: [], Approved: ['WAR-1000', 'WAR-1001'], Done: ['WAR-1002'] });
      expect(board.moveItem).toHaveBeenCalledWith('item-1', 'APPROVED');
      http.expectNone(`${ITEMS_URL}/item-1/status`);

      board.itemMoved$.next(echo());
      fixture.detectChanges();

      expect(columns().Approved).toEqual(['WAR-1000', 'WAR-1001']);
      expect(root().querySelector('[role="status"].sr-only')?.textContent).toContain('WAR-1000 movido a Approved.');
      expect(moveList('WAR-1000').getAttribute('aria-busy')).toBe('false');
    });

    it('does not let a card that is waiting for an answer move again', async () => {
      await open();

      chooseMove('WAR-1000', 'APPROVED');
      expect(moveList('WAR-1000').getAttribute('aria-busy')).toBe('true');
      chooseMove('WAR-1000', 'DONE');

      expect(board.moveItem).toHaveBeenCalledTimes(1);
      expect(columns().Done).toEqual(['WAR-1002']);
    });

    it('puts the card back and says why when the server refuses the move', async () => {
      await open();
      chooseMove('WAR-1000', 'APPROVED');

      board.errors$.next({ code: 'FORBIDDEN', message: 'Not allowed to move this item', workItemCode: 'item-1' });
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1000']);
      expect(notifications.notifications().map((n) => n.message)).toEqual(['Not allowed to move this item']);
      await flushItems(CARDS); // someone else may have moved it first: the board reloads to be sure
    });

    it("ignores a refusal of something that is not this board's move", async () => {
      await open();

      board.errors$.next({ code: 'WORK_ITEM_NOT_FOUND', message: 'Nope', workItemCode: 'item-9' });
      board.errors$.next({ code: 'BAD_JSON', message: 'Nope' });

      expect(notifications.notifications()).toEqual([]);
    });

    it('reloads the board when a move is never answered', async () => {
      await open();
      vi.useFakeTimers();
      chooseMove('WAR-1000', 'APPROVED');

      vi.advanceTimersByTime(MOVE_TIMEOUT_MS + 1);

      expect(notifications.notifications()[0].message).toContain('WAR-1000');
      http.expectOne((req) => req.url === ITEMS_URL).flush({ items: CARDS, total: 3, page: 0, size: BOARD_PAGE_SIZE });
    });

    it('uses the API when there is no live connection, and settles on its answer', async () => {
      await open();
      board.moveItem.mockReturnValue(false);

      chooseMove('WAR-1000', 'APPROVED');
      expect(columns().Approved).toEqual(['WAR-1000', 'WAR-1001']);

      const request = http.expectOne(`${ITEMS_URL}/item-1/status`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ status: 'APPROVED' });
      request.flush(workItem({ status: STATUS.APPROVED }));
      fixture.detectChanges();

      expect(columns().Approved).toEqual(['WAR-1000', 'WAR-1001']);
      expect(moveList('WAR-1000').getAttribute('aria-busy')).toBe('false');
    });

    it('puts the card back with the API error when the API refuses it', async () => {
      await open();
      board.moveItem.mockReturnValue(false);
      chooseMove('WAR-1000', 'APPROVED');

      http
        .expectOne(`${ITEMS_URL}/item-1/status`)
        .flush({ code: 'InvalidTransition', message: 'Cannot move from New to Approved' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1000']);
      expect(notifications.notifications().map((n) => n.message)).toEqual(['Cannot move from New to Approved']);
      await flushItems(CARDS);
    });

    it('moves the card that was dropped into the column it was dropped in', async () => {
      await open();
      const lists = dropLists();
      const [newList, approvedList] = lists.map((debug) => debug.injector.get(CdkDropList));

      lists[1].triggerEventHandler('cdkDropListDropped', {
        previousContainer: newList,
        container: approvedList,
        item: { data: CARDS[1] },
      } as unknown as CdkDragDrop<string, string, WorkItemSummary>);
      fixture.detectChanges();

      expect(board.moveItem).toHaveBeenCalledWith('item-1', 'APPROVED');
      expect(columns().Approved).toEqual(['WAR-1000', 'WAR-1001']);
    });

    it('does nothing when a member drops a card where it already was', async () => {
      auth.becomes('MEMBER');
      await open();
      const list = dropLists()[0];
      const container = list.injector.get(CdkDropList);

      list.triggerEventHandler('cdkDropListDropped', { previousContainer: container, container, previousIndex: 0, currentIndex: 0, item: { data: CARDS[1] } });

      expect(board.moveItem).not.toHaveBeenCalled();
      http.expectNone((req) => req.url.endsWith('/rank'));
    });

    it('keeps focus on the card after moving it from its own list, which moves to another column', async () => {
      await open();

      chooseMove('WAR-1000', 'APPROVED');
      await settle();

      expect(document.activeElement).toBe(moveList('WAR-1000'));
    });

    it('puts a card that changes column at the end of its priority in the new one: its rank is gone', async () => {
      await open({ items: [...RANKED.slice(0, 2), summary({ workItemCode: 'x', workItemNumber: 1005, displayKey: 'WAR-1005', status: STATUS.APPROVED, boardRank: 1 })] });

      chooseMove('WAR-1001', 'APPROVED');

      expect(columns().Approved).toEqual(['WAR-1005', 'WAR-1001']);
    });
  });

  describe('the order of the cards', () => {
    const reorderRequest = (code: string) => http.expectOne(`${ITEMS_URL}/${code}/rank`);

    it('has Subir and Bajar on every card for an owner or admin, disabled at the ends of the priority', async () => {
      await open({ items: RANKED });

      expect(button('Subir WAR-1000 dentro de su prioridad').disabled).toBe(true);
      expect(button('Bajar WAR-1000 dentro de su prioridad').disabled).toBe(false);
      expect(button('Subir WAR-1002 dentro de su prioridad').disabled).toBe(false);
      expect(button('Bajar WAR-1002 dentro de su prioridad').disabled).toBe(true);
      expect(button('Subir WAR-1003 dentro de su prioridad').disabled).toBe(true); // alone in its priority
      expect(button('Bajar WAR-1003 dentro de su prioridad').disabled).toBe(true);
    });

    it('shows them disabled, with the reason, to a member, who sees the order and cannot change it', async () => {
      auth.becomes('MEMBER');
      await open({ items: RANKED });

      const buttons = [...root().querySelectorAll<HTMLButtonElement>('button[aria-label^="Subir"], button[aria-label^="Bajar"]')];
      expect(buttons).toHaveLength(8);
      expect(buttons.every((b) => b.disabled)).toBe(true);
      expect(buttons[0].title).toBe('Solo los propietarios y administradores cambian el orden de las tarjetas.');
      expect(columns().New).toEqual(['WAR-1003', 'WAR-1000', 'WAR-1001', 'WAR-1002']);
      expect(root().textContent).toContain('por el orden que fijan los administradores');
    });

    it('moves a card down: shown at once, sent as "before the card after next"', async () => {
      await open({ items: RANKED });

      button('Bajar WAR-1000 dentro de su prioridad').click();
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1001', 'WAR-1000', 'WAR-1002']);
      const request = reorderRequest('a');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ beforeCode: 'c' });
      request.flush(workItem());
      fixture.detectChanges();
      expect(columns().New).toEqual(['WAR-1003', 'WAR-1001', 'WAR-1000', 'WAR-1002']);
    });

    it('moves a card up: sent as "before the card above it"', async () => {
      await open({ items: RANKED });

      button('Subir WAR-1002 dentro de su prioridad').click();
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1000', 'WAR-1002', 'WAR-1001']);
      const request = reorderRequest('c');
      expect(request.request.body).toEqual({ beforeCode: 'b' });
      request.flush(workItem());
    });

    it('sends the card to the end of its priority when nothing follows it', async () => {
      await open({ items: RANKED });

      button('Bajar WAR-1001 dentro de su prioridad').click(); // b goes below c: last
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1000', 'WAR-1002', 'WAR-1001']);
      const request = reorderRequest('b');
      expect(request.request.body).toEqual({ beforeCode: null });
      request.flush(workItem());
    });

    it('waits for one reorder to be answered before the next', async () => {
      await open({ items: RANKED });

      button('Bajar WAR-1000 dentro de su prioridad').click();
      fixture.detectChanges();

      expect(button('Bajar WAR-1001 dentro de su prioridad').disabled).toBe(true);
      reorderRequest('a').flush(workItem());
      fixture.detectChanges();
      expect(button('Bajar WAR-1001 dentro de su prioridad').disabled).toBe(false);
    });

    it('puts the order back and says why when the server refuses', async () => {
      await open({ items: RANKED });
      button('Bajar WAR-1000 dentro de su prioridad').click();
      fixture.detectChanges();

      reorderRequest('a').flush({ code: 'FORBIDDEN', message: 'Only an owner or an admin can do this' }, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1000', 'WAR-1001', 'WAR-1002']);
      expect(notifications.notifications().map((n) => n.message)).toEqual(['Only an owner or an admin can do this']);
      await flushItems(RANKED);
    });

    it('reorders when a card is dropped between two others of its column: before the next of its own priority', async () => {
      await open({ items: RANKED });
      const list = dropLists()[0];
      const container = list.injector.get(CdkDropList);
      const c = RANKED[2];

      // c dragged to the very top, above the critical card: the closest place in its own priority is before a
      list.triggerEventHandler('cdkDropListDropped', { previousContainer: container, container, previousIndex: 3, currentIndex: 0, item: { data: c } });
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1002', 'WAR-1000', 'WAR-1001']);
      expect(reorderRequest('c').request.body).toEqual({ beforeCode: 'a' });
    });

    it('drops a card at the end of the column as last of its priority', async () => {
      await open({ items: RANKED });
      const list = dropLists()[0];
      const container = list.injector.get(CdkDropList);

      list.triggerEventHandler('cdkDropListDropped', { previousContainer: container, container, previousIndex: 1, currentIndex: 3, item: { data: RANKED[0] } });
      fixture.detectChanges();

      expect(columns().New).toEqual(['WAR-1003', 'WAR-1001', 'WAR-1002', 'WAR-1000']);
      expect(reorderRequest('a').request.body).toEqual({ beforeCode: null });
    });

    it('sends nothing when the drop leaves the order as it was', async () => {
      await open({ items: RANKED });
      const list = dropLists()[0];
      const container = list.injector.get(CdkDropList);

      // a dragged above the critical card: the closest place in its own priority is where it already is
      list.triggerEventHandler('cdkDropListDropped', { previousContainer: container, container, previousIndex: 1, currentIndex: 0, item: { data: RANKED[0] } });

      http.expectNone((req) => req.url.endsWith('/rank'));
      expect(columns().New).toEqual(['WAR-1003', 'WAR-1000', 'WAR-1001', 'WAR-1002']);
    });

    it("reloads the column when an owner or admin reorders it elsewhere", async () => {
      await open({ items: RANKED });
      vi.useFakeTimers();

      board.itemsReordered$.next({ workItemCode: 'a', displayKey: 'WAR-1000', status: STATUS.NEW });
      vi.advanceTimersByTime(600);

      http.expectOne((req) => req.url === ITEMS_URL).flush({ items: RANKED, total: 4, page: 0, size: BOARD_PAGE_SIZE });
    });
  });

  describe("other people's changes", () => {
    it('moves the card when someone else moves it, and says so', async () => {
      await open();

      board.itemMoved$.next(echo(STATUS.APPROVED, { movedBy: { userCode: 'u-2', fullName: 'Luis Lopez' } }));
      fixture.detectChanges();

      expect(columns()).toEqual({ New: [], Approved: ['WAR-1000', 'WAR-1001'], Done: ['WAR-1002'] });
      expect(root().querySelector('[role="status"].sr-only')?.textContent).toContain('Luis Lopez movió WAR-1000 a Approved.');
    });

    it('applies a status change made elsewhere, such as on the detail page', async () => {
      await open();

      board.statusChanged$.next({
        workItemCode: 'item-2',
        displayKey: 'WAR-1001',
        status: STATUS.DONE,
        allowedStatuses: [],
        changedBy: { userCode: 'u-2', fullName: 'Luis Lopez' },
        updatedAt: '2026-01-06T10:00:00Z',
      });
      fixture.detectChanges();

      expect(columns().Done).toEqual(['WAR-1001', 'WAR-1002']);
    });

    it("lets the server's answer win over this user's own move when someone else moved the card first", async () => {
      await open();
      chooseMove('WAR-1000', 'APPROVED');

      // Someone else's move of the same card is handled first and finds it in Done… their answer stands
      board.itemMoved$.next(echo(STATUS.DONE, { fromStatus: 'NEW', movedBy: { userCode: 'u-2', fullName: 'Luis Lopez' } }));
      fixture.detectChanges();
      expect(columns().Done).toEqual(['WAR-1000', 'WAR-1002']);
      expect(moveList('WAR-1000').getAttribute('aria-busy')).toBe('true'); // still waiting for the answer to its own

      board.itemMoved$.next(echo(STATUS.APPROVED));
      fixture.detectChanges();
      expect(columns().Approved).toEqual(['WAR-1000', 'WAR-1001']);
      expect(moveList('WAR-1000').getAttribute('aria-busy')).toBe('false');
    });

    it('reloads once when an item it has not loaded moves: another type, or a new one', async () => {
      await open();
      vi.useFakeTimers();

      board.itemMoved$.next(echo(STATUS.APPROVED, { workItemCode: 'item-9', displayKey: 'WAR-1009' }));
      board.itemMoved$.next(echo(STATUS.DONE, { workItemCode: 'item-9', displayKey: 'WAR-1009' }));
      vi.advanceTimersByTime(600);

      http.expectOne((req) => req.url === ITEMS_URL).flush({ items: CARDS, total: 3, page: 0, size: BOARD_PAGE_SIZE });
    });
  });

  describe('choosing what to show', () => {
    it('follows the project and type into the URL', async () => {
      await open();

      choose('type', 'TASK');
      await vi.waitFor(() => expect(router.parseUrl(router.url).queryParams['type']).toBe('TASK'));
      fixture.detectChanges();

      http.expectOne(`${API}/api/status-workflows/TASK`).flush({ ...WORKFLOW, itemType: 'TASK' });
      const request = await itemsRequest();
      expect(request.request.params.get('type')).toBe('TASK');
      request.flush({ items: [], total: 0, page: 0, size: BOARD_PAGE_SIZE });
    });
  });
});
