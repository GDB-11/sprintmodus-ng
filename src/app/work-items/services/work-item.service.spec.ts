import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/notifications/notification.service';
import { workItem } from '../work-items.testing';
import { WorkItemService } from './work-item.service';

const BASE = `${environment.apiUrl}/api/work-items`;

describe('WorkItemService', () => {
  let service: WorkItemService;
  let http: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WorkItemService);
    http = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => http.verify());

  const messages = () => notifications.notifications().map((n) => [n.kind, n.message]);

  it('lists with only the filters that are set', () => {
    service.list({ projectCode: 'p1', type: 'BUG', page: 0, size: 25, status: undefined }).subscribe();

    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'projectCode', 'size', 'type']);
    expect(request.request.params.get('type')).toBe('BUG');
    request.flush({ items: [], total: 0, page: 0, size: 25 });
  });

  it('creates an item and shows the warnings the backend attached', () => {
    service
      .create({ projectCode: 'p1', type: 'TASK', title: 'Directly under an epic', parentCode: 'epic-1' })
      .subscribe();

    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ type: 'TASK', parentCode: 'epic-1' });
    request.flush(
      workItem({
        warnings: [{ code: 'NON_STANDARD_HIERARCHY', message: 'EPIC is not a recommended parent for TASK.' }],
      }),
    );

    expect(messages()).toEqual([['warning', 'EPIC is not a recommended parent for TASK.']]);
  });

  it('shows nothing when the change carries no warnings', () => {
    service.update('item-1', { title: 'New title' }).subscribe();

    const request = http.expectOne(`${BASE}/item-1`);
    expect(request.request.method).toBe('PUT');
    request.flush(workItem({ title: 'New title' }));

    expect(messages()).toEqual([]);
  });

  it('sets a parent with PUT and surfaces the warning of a non-standard one', () => {
    service.updateParent('item-1', 'feature-1').subscribe();

    const request = http.expectOne(`${BASE}/item-1/parent`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ parentCode: 'feature-1' });
    request.flush(
      workItem({ warnings: [{ code: 'NON_STANDARD_HIERARCHY', message: 'Consider reorganizing.' }] }),
    );

    expect(messages()).toEqual([['warning', 'Consider reorganizing.']]);
  });

  it('removes the parent with DELETE, never with an empty body', () => {
    service.updateParent('item-1', null).subscribe();

    const request = http.expectOne(`${BASE}/item-1/parent`);
    expect(request.request.method).toBe('DELETE');
    request.flush(workItem());
  });

  it('changes status and moves between sprint and backlog', () => {
    service.changeStatus('item-1', 'APPROVED').subscribe();
    const status = http.expectOne(`${BASE}/item-1/status`);
    expect(status.request.method).toBe('POST');
    expect(status.request.body).toEqual({ status: 'APPROVED' });
    status.flush(workItem());

    service.moveToSprint('item-1', 'sprint-1').subscribe();
    const sprint = http.expectOne(`${BASE}/item-1/sprint`);
    expect(sprint.request.method).toBe('PUT');
    expect(sprint.request.body).toEqual({ sprintCode: 'sprint-1' });
    sprint.flush(workItem({ warnings: [{ code: 'VELOCITY_NOT_UPDATED', message: 'Velocity is stale.' }] }));

    service.moveToSprint('item-1', null).subscribe();
    const backlog = http.expectOne(`${BASE}/item-1/sprint`);
    expect(backlog.request.method).toBe('DELETE');
    backlog.flush(workItem());

    expect(messages()).toEqual([['warning', 'Velocity is stale.']]);
  });

  it('creates and removes a link', () => {
    service.createLink('item-1', 'item-2', 'BLOCKS').subscribe();
    const create = http.expectOne(`${BASE}/item-1/links`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ targetCode: 'item-2', type: 'BLOCKS' });
    create.flush({ linkCode: 'link-1', type: 'BLOCKS', item: {} });

    service.removeLink('item-1', 'link-1').subscribe();
    const remove = http.expectOne(`${BASE}/item-1/links/link-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('soft-deletes and reads the workflow of a type', () => {
    service.delete('item-1').subscribe();
    const removal = http.expectOne(`${BASE}/item-1`);
    expect(removal.request.method).toBe('DELETE');
    removal.flush(null, { status: 204, statusText: 'No Content' });

    service.workflow('TASK').subscribe();
    http.expectOne(`${environment.apiUrl}/api/status-workflows/TASK`).flush({ itemType: 'TASK', statuses: [], transitions: [] });
  });

  it('upserts a workflow with POST', () => {
    const workflow = {
      itemType: 'TASK' as const,
      statuses: [{ code: 'NEW', displayName: 'New', order: 1, isTerminal: false }],
      transitions: [],
    };
    service.upsertWorkflow(workflow).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/api/admin/status-workflows`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(workflow);
    request.flush(workflow);
  });

  it('reorders a card with PUT .../rank, before another card or last', () => {
    service.reorder('item-1', 'item-2').subscribe();
    const before = http.expectOne(`${BASE}/item-1/rank`);
    expect(before.request.method).toBe('PUT');
    expect(before.request.body).toEqual({ beforeCode: 'item-2' });
    before.flush({});

    service.reorder('item-1', null).subscribe();
    http.expectOne(`${BASE}/item-1/rank`).flush({});
  });

  it('asks for the board order of a list', () => {
    service.list({ projectCode: 'p1', sort: 'board' }).subscribe();

    const request = http.expectOne((req) => req.url === BASE);
    expect(request.request.params.get('sort')).toBe('board');
    request.flush({ items: [], total: 0, page: 0, size: 50 });
  });
});
