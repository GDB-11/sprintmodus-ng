import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { SprintConfig } from '../../../projects/models/project.models';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SprintSettings } from './sprint-settings';

const URL = `${environment.apiUrl}/api/sprints/config`;
const CONFIG: SprintConfig = { defaultSprintDays: 14, sprintStartDay: 'MONDAY', velocityTrackingEnabled: true };

describe('SprintSettings', () => {
  let fixture: ComponentFixture<SprintSettings>;
  let http: HttpTestingController;
  let auth: FakeAuth;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SprintSettings],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const control = <T extends HTMLElement>(id: string) => root().querySelector<T>(`#${id}`)!;

  async function open(config: SprintConfig = CONFIG): Promise<void> {
    fixture = TestBed.createComponent(SprintSettings);
    fixture.detectChanges();
    http.expectOne(URL).flush(config);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const nextSave = () => vi.waitFor(() => http.expectOne((req) => req.url === URL && req.method === 'PUT'));

  it("fills the form with the organization's configuration", async () => {
    await open({ defaultSprintDays: 10, sprintStartDay: 'WEDNESDAY', velocityTrackingEnabled: false });

    expect(control<HTMLInputElement>('sprint-days').value).toBe('10');
    expect(control<HTMLSelectElement>('sprint-start-day').value).toBe('WEDNESDAY');
    expect([...control<HTMLSelectElement>('sprint-start-day').options].map((o) => o.textContent!.trim())).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
    expect(root().querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
  });

  it('saves what was changed, and says so', async () => {
    await open();
    const days = control<HTMLInputElement>('sprint-days');
    days.value = '7';
    days.dispatchEvent(new Event('input'));
    const day = control<HTMLSelectElement>('sprint-start-day');
    day.value = 'TUESDAY';
    day.dispatchEvent(new Event('input'));
    day.dispatchEvent(new Event('change'));
    const tracking = root().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    tracking.click(); // a real click toggles the box and raises the events a person's click does

    submit();

    const request = await nextSave();
    expect(request.request.body).toEqual({ defaultSprintDays: 7, sprintStartDay: 'TUESDAY', velocityTrackingEnabled: false });
    request.flush({ defaultSprintDays: 7, sprintStartDay: 'TUESDAY', velocityTrackingEnabled: false });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(notifications.notifications().map((n) => n.message)).toEqual(['Se guardó la configuración de sprints.']);
  });

  it('refuses a duration outside 1 to 90 before sending anything', async () => {
    await open();
    const days = control<HTMLInputElement>('sprint-days');

    for (const bad of ['0', '91', '', '2.5']) {
      days.value = bad;
      days.dispatchEvent(new Event('input'));
      submit();
      await fixture.whenStable();
      fixture.detectChanges();
      http.expectNone((req) => req.method === 'PUT');
      expect(root().querySelector('[role="alert"]')).not.toBeNull();
    }
  });

  it("shows the backend's reason when it refuses", async () => {
    await open();
    submit();

    (await nextSave()).flush({ code: 'FORBIDDEN', message: 'Only an owner or an admin can change this.' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Only an owner or an admin can change this.');
  });

  it('is read-only, with the reason, for a member', async () => {
    auth.becomes('MEMBER');
    await open({ defaultSprintDays: 10, sprintStartDay: 'FRIDAY', velocityTrackingEnabled: false });

    expect(root().querySelector('form')).toBeNull();
    const facts = [...root().querySelectorAll('dd')].map((dd) => dd.textContent!.trim());
    expect(facts).toEqual(['10 días', 'Viernes', 'Desactivado']);
    expect(root().textContent).toContain('Solo los propietarios y administradores cambian esta configuración.');
  });

  it('offers a retry when the configuration cannot be loaded', async () => {
    fixture = TestBed.createComponent(SprintSettings);
    fixture.detectChanges();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar la configuración.');
    root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    (await vi.waitFor(() => http.expectOne(URL))).flush(CONFIG);
  });

  it('is free of accessibility violations, for an admin and for a member', async () => {
    await open();
    await expectNoAxeViolations(root());

    auth.becomes('MEMBER');
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
