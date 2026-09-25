import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { Sprint } from '../../../projects/models/project.models';
import { sprint } from '../../../projects/projects.testing';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SprintCreate } from './sprint-create';

const URL = `${environment.apiUrl}/api/sprints`;

describe('SprintCreate', () => {
  let fixture: ComponentFixture<SprintCreate>;
  let http: HttpTestingController;
  let auth: FakeAuth;
  let notifications: NotificationService;
  let created: Sprint[];

  beforeEach(async () => {
    created = [];
    await TestBed.configureTestingModule({
      imports: [SprintCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => root().querySelector<HTMLInputElement>(`#${id}`)!;

  function open(): void {
    fixture = TestBed.createComponent(SprintCreate);
    fixture.componentRef.setInput('projectCode', 'p1');
    fixture.componentInstance.created.subscribe((value) => created.push(value));
    fixture.detectChanges();
  }

  function type(id: string, value: string): void {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  }

  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const nextRequest = () => vi.waitFor(() => http.expectOne(URL));

  it('creates a sprint of the project with what was typed, and starts over', async () => {
    open();
    type('sprint-name', '  Sprint 7  ');
    type('sprint-start', '2026-03-02');
    type('sprint-planned', '30');

    submit();

    const request = await nextRequest();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ projectCode: 'p1', name: 'Sprint 7', startDate: '2026-03-02', plannedVelocity: 30 });
    const made = sprint({ sprintCode: 's7', name: 'Sprint 7' });
    request.flush(made);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(created).toEqual([made]);
    expect(notifications.notifications().map((n) => n.message)).toEqual(['Se creó Sprint 7.']);
    expect(input('sprint-name').value).toBe('');
  });

  it('leaves out what was not given: the start date and the points are optional', async () => {
    open();
    type('sprint-name', 'Sprint 8');

    submit();

    const request = await nextRequest();
    expect(request.request.body).toEqual({ projectCode: 'p1', name: 'Sprint 8', startDate: undefined, plannedVelocity: undefined });
    request.flush(sprint());
  });

  it('asks for a name, and for sensible points, before it sends anything', async () => {
    open();
    type('sprint-planned', '-3');

    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(URL);
    const alerts = [...root().querySelectorAll('[role="alert"]')].map((a) => a.textContent!.trim());
    expect(alerts).toEqual(['Ingresa un nombre.', 'Ingresa un número entero de 0 a 100000.']);
  });

  it("shows the backend's reason when it refuses, and keeps what was typed", async () => {
    open();
    type('sprint-name', 'Clash');
    type('sprint-start', '2026-03-02');
    submit();

    (await nextRequest()).flush({ code: 'SPRINT_OVERLAP', message: 'The dates overlap another sprint.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('The dates overlap another sprint.');
    expect(input('sprint-name').value).toBe('Clash');
    expect(created).toEqual([]);
  });

  it('is a disabled button with the reason for a member, who does not plan sprints', () => {
    auth.becomes('MEMBER');
    open();

    expect(root().querySelector('form')).toBeNull();
    const button = root().querySelector<HTMLButtonElement>('button')!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-describedby')).toBe('create-hint');
    expect(root().querySelector('#create-hint')?.textContent).toContain('Solo los propietarios y administradores planifican los sprints.');
  });

  it('is free of accessibility violations, for an admin and for a member', async () => {
    open();
    await expectNoAxeViolations(root());

    auth.becomes('MEMBER');
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
