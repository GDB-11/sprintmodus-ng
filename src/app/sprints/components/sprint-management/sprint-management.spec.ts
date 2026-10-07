import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { Sprint, VelocityHistory } from '../../../projects/models/project.models';
import { burndown, sprint } from '../../../projects/projects.testing';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { CHART_FACTORY } from '../burndown-chart/burndown-chart';
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
      providers: [provideRouter([{ path: 'sprints', component: SprintManagement }]), provideHttpClient(), provideHttpClientTesting(), provideFakeAuth(),
        { provide: CHART_FACTORY, useValue: () => ({ update: () => undefined, destroy: () => undefined }) },
      ],
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
  const rows = () => [...root().querySelector('app-data-table')!.querySelectorAll('tbody tr')];
  const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim();

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Answers the burndown request(s) the screen makes for the sprint it shows (ones superseded meanwhile are skipped). */
  async function answerBurndown(pace: (number | null)[] = [36, 30]): Promise<void> {
    const requests = await wait(() => {
      const pending = http.match((req) => /\/sprints\/[^/]+\/burndown$/.test(req.url)).filter((r) => !r.cancelled);
      expect(pending.length).toBeGreaterThan(0);
      return pending;
    });
    for (const request of requests) {
      const code = request.request.url.split('/').at(-2)!;
      request.flush(burndown(14, 40, pace, { sprintCode: code, sprintName: `Sprint ${code.slice(1)}` }));
    }
    await settle();
  }

  const hasStarted = (sprints: Sprint[]) => sprints.some((s) => s.status !== 'PLANNED');

  /** Opens the screen and answers what it asks for: projects, then the sprints, the burndown shown, the velocity and the configuration of the first project. */
  async function open(sprints: Sprint[] = [CLOSED, ACTIVE, PLANNED], url = '/sprints', pace?: (number | null)[]): Promise<void> {
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
    fixture.detectChanges();
    if (hasStarted(sprints)) {
      await answerBurndown(pace);
    }
    await settle();
  }

  /** Answers the reload that follows a change to the sprints. */
  async function reloaded(sprints: Sprint[]): Promise<void> {
    (await wait(() => http.expectOne(`${API}/sprints?projectCode=p1`))).flush(sprints);
    (await wait(() => http.expectOne((req) => req.url === `${API}/sprints/velocity-history`))).flush(HISTORY);
    fixture.detectChanges();
    if (hasStarted(sprints)) {
      await answerBurndown();
    }
    await settle();
  }

  it('lists the sprints of the first project, newest first, with their state in words, dates and points', async () => {
    await open();

    expect(rows().map((row) => [...row.querySelectorAll('td')].slice(0, 5).map(text))).toEqual([
      ['Sprint 3', 'Planificado', '2–16 feb14 días', '0', '0'],
      ['Sprint 2', 'Activo', '19 ene–2 feb14 días', '30', '8'],
      ['Sprint 1', 'Cerrado', '5–19 ene14 días', '30', '24'],
    ]);
    expect(root().querySelector('h1')?.textContent).toBe('Sprints');
  });

  describe('the burndown', () => {
    it('shows the active sprint in place, with the chart', async () => {
      await open();

      expect(root().textContent).toContain('Burndown · Sprint 2');
      expect(root().querySelector('app-burndown-chart canvas')).not.toBeNull();
      expect(button('Burndown Sprint 2').getAttribute('aria-pressed')).toBe('true');
    });

    it('says how far above the ideal pace the sprint is, in hours', async () => {
      await open([CLOSED, ACTIVE, PLANNED], '/sprints', [39, 38]);

      expect(text(root())).toContain('h por encima del ritmo ideal');
    });

    it('says the sprint is on track when it is not above the ideal pace', async () => {
      await open();

      expect(root().textContent).toContain('Al día o por delante del ritmo ideal');
    });

    it('switches to another sprint that has begun when its button is pressed', async () => {
      await open();

      button('Burndown Sprint 1').click();
      await answerBurndown();

      expect(root().textContent).toContain('Burndown · Sprint 1');
      expect(button('Burndown Sprint 1').getAttribute('aria-pressed')).toBe('true');
    });

    it('is disabled, with the reason, for a sprint that has not started', async () => {
      await open();

      const planned = button('Burndown Sprint 3');
      expect(planned.disabled).toBe(true);
      expect(planned.title).toBe('El burndown empieza cuando se inicia el sprint.');
    });

    it('is not shown while no sprint has begun', async () => {
      await open([PLANNED]);

      expect(root().textContent).not.toContain('Burndown ·');
    });
  });

  it('shows the velocity of the last closed sprints and the organization configuration', async () => {
    await open();

    expect(text(root())).toContain('Velocidad promedio de los últimos 1 sprint cerrado: 24 puntos.');
    expect(root().querySelector('#sprint-days')).not.toBeNull();
  });

  it('opens the form for a new sprint from the header button', async () => {
    await open();
    expect(root().querySelector('#sprint-name')).toBeNull();

    button('Nuevo sprint').click();
    fixture.detectChanges();

    expect(root().querySelector('#sprint-name')).not.toBeNull();
  });

  it('follows the project the shell has selected', async () => {
    await open([], '/sprints?project=p2');

    expect(root().textContent).toContain('Este proyecto aún no tiene sprints.');
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

      expect(button('Burndown Sprint 1').disabled).toBe(false);
      expect(root().querySelector('app-burndown-chart')).not.toBeNull();
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
