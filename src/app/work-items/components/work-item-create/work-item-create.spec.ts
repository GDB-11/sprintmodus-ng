import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { summary, workItem } from '../../work-items.testing';
import { WorkItemCreate } from './work-item-create';
import { expectNoAxeViolations } from '../../../testing/axe';

const API = environment.apiUrl;
const PROJECTS = [
  { projectCode: 'p1', name: 'Web App Rewrite', key: 'WAR' },
  { projectCode: 'p2', name: 'Mobile', key: 'MOB' },
];

describe('WorkItemCreate', () => {
  let fixture: ComponentFixture<WorkItemCreate>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemCreate],
      providers: [provideRouter([{ path: 'work-items/new', component: WorkItemCreate }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const alerts = () => [...root().querySelectorAll('[role="alert"]')].map((el) => el.textContent?.trim());

  /** Opens the page, answers the project list and the parent candidates of the chosen project. */
  async function open(url = '/work-items/new?project=p2'): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(WorkItemCreate);
    fixture.detectChanges();
    http.expectOne(`${API}/api/projects`).flush(PROJECTS);
    fixture.detectChanges();
    const candidates = await vi.waitFor(() =>
      http.expectOne((req) => req.url === `${API}/api/work-items`),
    );
    candidates.flush({
      items: [summary({ workItemCode: 'epic-1', displayKey: 'MOB-1000', title: 'Checkout', type: 'EPIC' })],
      total: 1,
      page: 0,
      size: 200,
    });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const control = <T extends HTMLElement>(id: string) => root().querySelector<T>(`#${id}`)!;

  async function fill(id: string, value: string): Promise<void> {
    const element = control<HTMLInputElement>(id);
    element.value = value;
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(new Event('change'));
    element.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit'));

  it('preselects the project from the URL and offers every type', async () => {
    await open();

    expect(control<HTMLSelectElement>('projectCode').value).toBe('p2');
    const types = [...control<HTMLSelectElement>('type').options].map((option) => option.textContent?.trim());
    expect(types).toEqual(['Épica', 'Característica', 'Elemento del backlog', 'Error', 'Tarea']);
    const parents = [...control<HTMLSelectElement>('parentCode').options].map((option) => option.textContent?.trim());
    expect(parents).toEqual(['Sin elemento superior', 'MOB-1000 · Checkout (Épica)']);
  });

  it('creates the item and opens it', async () => {
    await open();
    await fill('type', 'TASK');
    await fill('title', '  Call the gateway ');
    await fill('effortPoints', '3');
    await fill('parentCode', 'epic-1');
    submit();

    const request = await vi.waitFor(() => http.expectOne(`${API}/api/work-items`));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      projectCode: 'p2',
      type: 'TASK',
      title: 'Call the gateway',
      priority: 'MEDIUM',
      parentCode: 'epic-1',
      effortPoints: 3,
    });
    expect(request.request.body.description).toBeUndefined();
    request.flush(
      workItem({
        workItemCode: 'new-1',
        warnings: [{ code: 'NON_STANDARD_HIERARCHY', message: 'EPIC is not a recommended parent for TASK.' }],
      }),
    );
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/work-items', 'new-1']);
    expect(
      TestBed.inject(NotificationService)
        .notifications()
        .map((n) => n.message),
    ).toEqual(['EPIC is not a recommended parent for TASK.']);
  });

  it('asks for a title and does not call the backend without one', async () => {
    await open();
    await fill('effortPoints', '3');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(`${API}/api/work-items`);
    expect(alerts()).toContain('Ingresa un título.');
  });

  it('rejects effort points that are not whole numbers in range', async () => {
    await open();
    await fill('title', 'Story');
    await fill('effortPoints', '2.5');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(`${API}/api/work-items`);
    expect(alerts()).toContain('Ingresa un número entero de 0 a 1000.');
  });

  it("shows the backend's reason when the item is refused", async () => {
    await open();
    await fill('title', 'Story');
    submit();

    (await vi.waitFor(() => http.expectOne(`${API}/api/work-items`))).flush(
      { code: 'INVALID_PARENT', message: 'The parent belongs to another project.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(alerts()).toContain('The parent belongs to another project.');
    expect(navigate).not.toHaveBeenCalled();
  });


  it('has no accessibility violations, including with validation errors showing', async () => {
    await open();
    await expectNoAxeViolations(root());

    await fill('effortPoints', 'abc');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(alerts().length).toBeGreaterThan(0);
    await expectNoAxeViolations(root());
  });
});
