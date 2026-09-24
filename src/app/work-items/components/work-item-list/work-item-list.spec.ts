import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { summary } from '../../work-items.testing';
import { WorkItemList } from './work-item-list';
import { expectNoAxeViolations } from '../../../testing/axe';

const PROJECTS = [
  { projectCode: 'p1', name: 'Web App Rewrite', key: 'WAR' },
  { projectCode: 'p2', name: 'Mobile', key: 'MOB' },
];

describe('WorkItemList', () => {
  let fixture: ComponentFixture<WorkItemList>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemList],
      providers: [provideRouter([{ path: 'work-items', component: WorkItemList }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;

  /** Opens the page and answers the project list; the items request that follows is left for the test. */
  async function open(url = '/work-items', projects = PROJECTS): Promise<void> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(WorkItemList);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/projects`).flush(projects);
    fixture.detectChanges();
  }

  const nextItemsRequest = () =>
    vi.waitFor(() => http.expectOne((req) => req.url === `${environment.apiUrl}/api/work-items`));

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('lists the first project when the URL names none', async () => {
    await open();
    const request = await nextItemsRequest();
    expect(request.request.params.get('projectCode')).toBe('p1');
    expect(request.request.params.get('size')).toBe('25');
    request.flush({
      items: [summary(), summary({ workItemCode: 'item-2', displayKey: 'WAR-1001', title: 'Refund', type: 'BUG' })],
      total: 2,
      page: 0,
      size: 25,
    });
    await settle();

    const rows = [...root().querySelectorAll('tbody tr')].map((row) => row.textContent?.replace(/\s+/g, ' ').trim());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('WAR-1000');
    expect(rows[0]).toContain('Pay by card');
    expect(rows[1]).toContain('Bug');
    expect(root().querySelector('a[href="/work-items/item-1"]')?.textContent).toContain('WAR-1000');
    expect(root().textContent).toContain('Showing 1–2 of 2');
  });

  it('follows the project and type in the URL', async () => {
    await open('/work-items?project=p2&type=BUG');

    const request = await nextItemsRequest();
    expect(request.request.params.get('projectCode')).toBe('p2');
    expect(request.request.params.get('type')).toBe('BUG');
    request.flush({ items: [], total: 0, page: 0, size: 25 });
    await settle();

    expect(root().textContent).toContain('No Bug items in this project.');
  });

  it('asks for the next page and disables Previous on the first', async () => {
    await open();
    (await nextItemsRequest()).flush({ items: [summary()], total: 60, page: 0, size: 25 });
    await settle();

    const [previous, next] = [...root().querySelectorAll<HTMLButtonElement>('nav button')];
    expect(previous.disabled).toBe(true);
    expect(root().textContent).toContain('Showing 1–25 of 60');

    next.click();

    const request = await nextItemsRequest();
    expect(router.url).toBe('/work-items?page=1');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ items: [], total: 60, page: 1, size: 25 });
  });

  it('says so when the organization has no projects', async () => {
    await open('/work-items', []);
    await settle();

    expect(root().textContent).toContain('You have no projects yet');
    expect(root().querySelector('table')).toBeNull();
  });

  it('offers a retry when the items cannot be loaded', async () => {
    await open();
    (await nextItemsRequest()).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Could not load the work items.');
    root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();

    (await nextItemsRequest()).flush({ items: [summary()], total: 1, page: 0, size: 25 });
    await settle();
    expect(root().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('has no accessibility violations', async () => {
    await open();
    (await nextItemsRequest()).flush({
      items: [summary(), summary({ workItemCode: 'item-2', displayKey: 'WAR-1001', title: 'Refund', type: 'BUG' })],
      total: 60,
      page: 0,
      size: 25,
    });
    await settle();

    await expectNoAxeViolations(root());
  });
});
