import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { Sprint, VelocityHistory } from '../../../projects/models/project.models';
import { sprint } from '../../../projects/projects.testing';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { HISTORY_SPRINTS, SprintManagement } from './sprint-management';

const API = `${environment.apiUrl}/api`;

const PROJECTS = [
  { projectCode: 'p1', name: 'Web App Rewrite', key: 'WAR' },
  { projectCode: 'p2', name: 'Mobile', key: 'MOB' },
];

const CLOSED = sprint({ sprintCode: 's1', name: 'Sprint 1', status: 'CLOSED', startDate: '2026-01-05', endDate: '2026-01-19', plannedVelocity: 30, velocity: 24 });
const ACTIVE = sprint({ sprintCode: 's2', name: 'Sprint 2', status: 'ACTIVE', startDate: '2026-01-19', endDate: '2026-02-02', plannedVelocity: 30, velocity: 8 });
const PLANNED = sprint({ sprintCode: 's3', name: 'Sprint 3', status: 'PLANNED', startDate: '2026-02-02', endDate: '2026-02-16' });

const HISTORY: VelocityHistory = { projectCode: 'p1', sprints: [CLOSED], averageVelocity: 24 };

describe('SprintManagement', () => {
  let fixture: ComponentFixture<SprintManagement>;
  let http: HttpTestingController;
  let router: Router;
  let auth: FakeAuth;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SprintManagement],
      providers: [provideRouter([{ path: 'sprints', component: SprintManagement }]), provideHttpClient(), provideHttpClientTesting(), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const wait = <T>(check: () => T) => vi.waitFor(check);
  const button = (label: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.replace(/\s+/g, ' ').trim() === label)!;
  const rows = () => [...root().querySelectorAll('tbody tr')].filter((row) => row.querySelector('td')?.classList.contains('font-medium'));

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Opens the screen and answers what it asks for: projects, then the sprints, the velocity and the configuration of the first project. */
  async function open(sprints: Sprint[] = [CLOSED, ACTIVE, PLANNED], url = '/sprints'): Promise<void> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(SprintManagement);
    fixture.detectChanges();
    http.expectOne(`${API}/projects`).flush(PROJECTS);
    fixture.detectChanges();
    const project = url.includes('p2') ? 'p2' : 'p1';
    (await wait(() => http.expectOne(`${API}/sprints?projectCode=${project}`))).flush(sprints);
    const history = await wait(() => http.expectOne((req) => req.url === `${API}/sprints/velocity-history`));
    expect(history.request.params.get('projectCode')).toBe(project);
    expect(history.request.params.get('limit')).toBe(String(HISTORY_SPRINTS));
    history.flush({ ...HISTORY, projectCode: project });
    http.expectOne(`${API}/sprints/config`).flush({ defaultSprintDays: 14, sprintStartDay: 'MONDAY', velocityTrackingEnabled: true });
    await settle();
  }

  /** Answers the reload that follows a change to the sprints. */
  async function reloaded(sprints: Sprint[]): Promise<void> {
    (await wait(() => http.expectOne(`${API}/sprints?projectCode=p1`))).flush(sprints);
    (await wait(() => http.expectOne((req) => req.url === `${API}/sprints/velocity-history`))).flush(HISTORY);
    await settle();
  }

  it('lists the sprints of the first project, newest first, with their state in words, dates and points', async () => {
    await open();

    expect(rows().map((row) => [...row.querySelectorAll('td')].slice(0, 5).map((c) => c.textContent!.replace(/\s+/g, ' ').trim()))).toEqual([
      ['Sprint 3', 'Planificado', 'Feb 2, 2026 – Feb 16, 2026 14 días', '0', '0'],
      ['Sprint 2', 'Activo', 'Jan 19, 2026 – Feb 2, 2026 14 días', '30', '8'],
      ['Sprint 1', 'Cerrado', 'Jan 5, 2026 – Jan 19, 2026 14 días', '30', '24'],
    ]);
    expect(root().querySelector('h1')?.textContent).toBe('Sprints');
  });

  it('links the burndown of every sprint that has begun, and only those', async () => {
    await open();

    const links = [...root().querySelectorAll('a')].filter((a) => a.textContent!.trim() === 'Ver burndown').map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/sprints/s2/burndown', '/sprints/s1/burndown']);
  });

  it('shows the velocity of the last closed sprints, the organization configuration, and the form for a new sprint', async () => {
    await open();

    expect(root().textContent).toContain('Velocidad promedio de los últimos 1 sprint cerrado: 24 puntos.');
    expect(root().querySelector('#sprint-days')).not.toBeNull();
    expect(root().querySelector('#sprint-name')).not.toBeNull();
  });

  it('follows the project in the URL and changes it from the list', async () => {
    await open([], '/sprints?project=p2');
    expect(root().textContent).toContain('Este proyecto aún no tiene sprints.');

    const select = root().querySelector<HTMLSelectElement>('#project')!;
    select.value = 'p1';
    select.dispatchEvent(new Event('change'));
    await wait(() => expect(router.parseUrl(router.url).queryParams['project']).toBe('p1'));
    fixture.detectChanges();

    (await wait(() => http.expectOne(`${API}/sprints?projectCode=p1`))).flush([CLOSED]);
    (await wait(() => http.expectOne((req) => req.url === `${API}/sprints/velocity-history`))).flush(HISTORY);
    await settle();
    expect(rows()).toHaveLength(1);
  });

  describe('starting a sprint', () => {
    it('is refused while another sprint is active: a project has one at a time', async () => {
      await open();

      const start = button('Iniciar Sprint 3');
      expect(start.disabled).toBe(true);
      expect(start.title).toBe('Cierra primero el sprint activo: un proyecto tiene uno a la vez.');
    });

    it('starts the planned sprint, says so, and reloads', async () => {
      await open([CLOSED, PLANNED]);

      button('Iniciar Sprint 3').click();

      const request = await wait(() => http.expectOne(`${API}/sprints/s3/start`));
      expect(request.request.method).toBe('POST');
      request.flush({ ...PLANNED, status: 'ACTIVE' });
      await reloaded([CLOSED, { ...PLANNED, status: 'ACTIVE' }]);
      expect(notifications.notifications().map((n) => n.message)).toEqual(['Sprint 3 está en marcha.']);
      expect(rows()[0].textContent).toContain('Activo');
    });

    it("shows the backend's reason when it refuses, and reloads because someone else may have changed it", async () => {
      await open([CLOSED, PLANNED]);
      button('Iniciar Sprint 3').click();

      (await wait(() => http.expectOne(`${API}/sprints/s3/start`))).flush(
        { code: 'ANOTHER_SPRINT_ACTIVE', message: 'The project already has an active sprint.' },
        { status: 409, statusText: 'Conflict' },
      );
      (await wait(() => http.expectOne(`${API}/sprints?projectCode=p1`))).flush([CLOSED, PLANNED]);
      await settle();

      expect(notifications.notifications().map((n) => [n.kind, n.message])).toEqual([['error', 'The project already has an active sprint.']]);
    });
  });

  describe('closing a sprint', () => {
    it('asks first, next to the sprint, because it fixes its velocity and burndown', async () => {
      await open();

      button('Cerrar Sprint 2').click();
      fixture.detectChanges();

      const dialog = root().querySelector('[role="alertdialog"]')!;
      expect(dialog.textContent).toContain('¿Cerrar Sprint 2?');
      expect(dialog.textContent).toContain('no vuelven a cambiar');
      http.expectNone(`${API}/sprints/s2/close`);
    });

    it('closes it once confirmed, says so, and reloads the sprints and the velocity', async () => {
      await open();
      button('Cerrar Sprint 2').click();
      fixture.detectChanges();

      button('Sí, cerrar').click();

      const request = await wait(() => http.expectOne(`${API}/sprints/s2/close`));
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await reloaded([CLOSED, { ...ACTIVE, status: 'CLOSED' }, PLANNED]);
      expect(notifications.notifications().map((n) => n.message)).toEqual(['Sprint 2 se cerró. Su velocidad y su burndown quedaron fijos.']);
      expect(root().querySelector('[role="alertdialog"]')).toBeNull();
    });

    it('changes nothing when the question is cancelled', async () => {
      await open();
      button('Cerrar Sprint 2').click();
      fixture.detectChanges();

      button('Cancelar').click();
      fixture.detectChanges();

      expect(root().querySelector('[role="alertdialog"]')).toBeNull();
      http.expectNone(`${API}/sprints/s2/close`);
    });
  });

  describe('for a regular member', () => {
    beforeEach(() => auth.becomes('MEMBER'));

    it('shows the same sprints with start and close disabled, and why', async () => {
      await open();

      expect(button('Iniciar Sprint 3').disabled).toBe(true);
      expect(button('Cerrar Sprint 2').disabled).toBe(true);
      expect(button('Cerrar Sprint 2').getAttribute('aria-describedby')).toBe('plan-hint');
      expect(root().querySelector('#plan-hint')?.textContent).toContain('Solo los propietarios y administradores inician y cierran sprints.');
    });

    it('can still read the burndown, the velocity and the configuration', async () => {
      await open();

      expect(root().querySelectorAll('a[href$="/burndown"]')).toHaveLength(2);
      expect(root().textContent).toContain('Velocidad promedio');
      expect(root().textContent).toContain('Solo los propietarios y administradores cambian esta configuración.');
    });

    it('has no accessibility violations', async () => {
      await open();

      await expectNoAxeViolations(root());
    });
  });

  it('says so when the organization has no projects', async () => {
    await router.navigateByUrl('/sprints');
    fixture = TestBed.createComponent(SprintManagement);
    fixture.detectChanges();
    http.expectOne(`${API}/projects`).flush([]);
    await settle();

    expect(root().textContent).toContain('Aún no tienes proyectos.');
  });

  it('has no accessibility violations for an owner, with the close question open', async () => {
    await open();
    button('Cerrar Sprint 2').click();
    fixture.detectChanges();

    await expectNoAxeViolations(root());
  });
});
