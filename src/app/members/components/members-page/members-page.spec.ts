import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { openSelect, selectTrigger } from '../../../testing/select-menu';
import { Member, MemberPage } from '../../models/member.models';
import { MembersPage } from './members-page';

const URL = `${environment.apiUrl}/auth/users`;

function member(overrides: Partial<Member> = {}): Member {
  return {
    userCode: 'u1',
    fullName: 'Ana Pérez',
    email: 'ana@acme.test',
    role: 'OWNER',
    isActive: true,
    lastLoginAt: '2026-10-20T15:00:00Z',
    ...overrides,
  };
}

function page(items: Member[], count: number, maxUsers: number): MemberPage {
  return { items, page: 0, size: 50, total: items.length, count, maxUsers };
}

describe('MembersPage', () => {
  let fixture: ComponentFixture<MembersPage>;
  let http: HttpTestingController;
  let auth: FakeAuth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => (root().querySelector<HTMLInputElement>(`#${id}`) ?? document.querySelector<HTMLInputElement>(`#${id}`))!;
  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const text = () => root().textContent!.replace(/\s+/g, ' ');

  function type(id: string, value: string): void {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  }

  async function open(answer: MemberPage): Promise<void> {
    fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();
    http.expectOne((r) => r.url === URL && r.method === 'GET').flush(answer);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function fill(email = 'bea@acme.test'): void {
    type('member-name', 'Bea Ruiz');
    type('member-email', email);
    type('member-password', 'long-enough-pw');
  }

  it('lists the people with their role and state, and the seats used of the plan', async () => {
    await open(page([member(), member({ userCode: 'u2', fullName: 'Luis', email: 'luis@acme.test', role: 'MEMBER', isActive: false, lastLoginAt: null })], 1, 5));

    expect(text()).toContain('Ana Pérez');
    expect(text()).toContain('Propietario');
    expect(text()).toContain('Desactivado');
    expect(text()).toContain('Nunca');
    expect(text()).toContain('1 de 5 usuarios activos en el plan Pro');
  });

  it('adds a person with what was typed, says to hand the password over without showing it, and reloads the list', async () => {
    await open(page([member()], 1, 5));
    fill();

    submit();
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'POST'));
    expect(request.request.body).toEqual({ fullName: 'Bea Ruiz', email: 'bea@acme.test', role: 'MEMBER', password: 'long-enough-pw' });
    request.flush(member({ userCode: 'u2', fullName: 'Bea Ruiz', email: 'bea@acme.test', role: 'MEMBER' }), { status: 201, statusText: 'Created' });
    const reload = await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'GET'));
    reload.flush(page([member(), member({ userCode: 'u2', fullName: 'Bea Ruiz' })], 2, 5));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(NotificationService).notifications().map((n) => n.message)).toEqual([
      'Se agregó a Bea Ruiz. Entrégale la contraseña inicial por un canal seguro: no se volverá a mostrar.',
    ]);
    expect(text()).not.toContain('long-enough-pw');
    expect(input('member-name').value).toBe('');
    expect(text()).toContain('2 de 5 usuarios activos');
  });

  it('sets someone else\'s password, but never the owner\'s or one\'s own', async () => {
    auth.becomes('OWNER', 'u1');
    await open(page([member(), member({ userCode: 'u2', fullName: 'Luis', role: 'MEMBER' })], 2, 5));
    const reset = (name: string) =>
      Array.from(root().querySelectorAll<HTMLButtonElement>(`button[aria-label="Restablecer contraseña de ${name}"]`));
    expect(reset('Ana Pérez').every((b) => b.disabled)).toBe(true);
    expect(reset('Luis').every((b) => !b.disabled)).toBe(true);

    reset('Luis')[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    type('reset-password', 'brand-new-pw');
    document.querySelector('dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === `${URL}/u2/password` && r.method === 'PUT'));
    expect(request.request.body).toEqual({ newPassword: 'brand-new-pw' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
  });

  it('asks before deactivating, then deactivates and reloads; never offers it for oneself', async () => {
    auth.becomes('OWNER', 'u1');
    await open(page([member(), member({ userCode: 'u2', fullName: 'Luis', role: 'MEMBER' })], 2, 5));
    const toggle = (label: string) => root().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    expect(toggle('Desactivar a Ana Pérez').disabled).toBe(true);

    toggle('Desactivar a Luis').click();
    await fixture.whenStable();
    fixture.detectChanges();
    http.expectNone((r) => r.url === `${URL}/u2/active`);
    const dialog = [...document.querySelectorAll('dialog')].find((d) => d.textContent!.includes('¿Desactivar a Luis?'))!;
    expect(dialog).toBeTruthy();

    [...dialog.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Sí, desactivar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === `${URL}/u2/active` && r.method === 'PUT'));
    expect(request.request.body).toEqual({ active: false });
    request.flush(null, { status: 204, statusText: 'No Content' });
    (await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'GET'))).flush(
      page([member(), member({ userCode: 'u2', fullName: 'Luis', role: 'MEMBER', isActive: false })], 1, 5),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toggle('Reactivar a Luis')).toBeTruthy();
  });

  it('reactivates at once, and says so when the plan has no seat left', async () => {
    auth.becomes('OWNER', 'u1');
    await open(page([member(), member({ userCode: 'u2', fullName: 'Luis', role: 'MEMBER', isActive: false })], 5, 5));

    root().querySelector<HTMLButtonElement>('button[aria-label="Reactivar a Luis"]')!.click();
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === `${URL}/u2/active` && r.method === 'PUT'));
    expect(request.request.body).toEqual({ active: true });
    request.flush({ code: 'USER_LIMIT_REACHED', message: 'The plan allows 5 active users.' }, { status: 402, statusText: 'Payment Required' });
    (await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'GET'))).flush(page([member()], 5, 5));
    await fixture.whenStable();
  });

  it('offers an owner admin and member, and an admin only member', async () => {
    await open(page([member()], 1, 5));
    expect(openSelect(selectTrigger(root(), 'Rol'), () => fixture.detectChanges())).toEqual(['Administrador', 'Miembro']);
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container *').forEach((n) => n.remove());
    auth.becomes('ADMIN');
    await open(page([member()], 1, 5));
    expect(openSelect(selectTrigger(root(), 'Rol'), () => fixture.detectChanges())).toEqual(['Miembro']);
  });

  it('asks for the missing fields before it sends anything', async () => {
    await open(page([member()], 1, 5));
    type('member-email', 'nope');
    type('member-password', 'short');

    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'POST');
    const alerts = [...root().querySelectorAll('[role="alert"]')].map((a) => a.textContent!.trim());
    expect(alerts).toEqual(['Ingresa el nombre completo.', 'Ingresa un correo válido.', 'Usa al menos 8 caracteres.']);
  });

  it('disables the submit with the reason once every seat is used, and keeps the list', async () => {
    await open(page([member()], 5, 5));

    const button = root().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.disabled).toBe(true);
    expect(text()).toContain('Tu plan Pro permite 5 usuarios y ya los tienes todos.');
    expect(text()).toContain('Ana Pérez');
  });

  it('says the same, and reloads the count, when the server finds no seat left', async () => {
    await open(page([member()], 4, 5));
    fill();

    submit();
    (await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'POST'))).flush(
      { code: 'USER_LIMIT_REACHED', message: 'The plan allows 5 active users.' },
      { status: 402, statusText: 'Payment Required' },
    );
    (await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'GET'))).flush(page([member()], 5, 5));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('Tu plan Pro permite 5 usuarios y ya los tienes todos.');
    fixture.detectChanges();
    expect(root().querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
  });

  it("shows the backend's reason when it refuses, and keeps what was typed", async () => {
    await open(page([member()], 1, 5));
    fill('ana@acme.test');

    submit();
    (await vi.waitFor(() => http.expectOne((r) => r.url === URL && r.method === 'POST'))).flush(
      { code: 'EMAIL_TAKEN', message: 'A user with this email already exists in the organization.' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('A user with this email already exists');
    expect(input('member-email').value).toBe('ana@acme.test');
  });

  it('generates a password and can show or hide it', async () => {
    await open(page([member()], 1, 5));
    expect(input('member-password').type).toBe('password');

    [...root().querySelectorAll('button')].find((b) => b.textContent!.includes('Generar'))!.click();
    fixture.detectChanges();

    expect(input('member-password').type).toBe('text');
    expect(input('member-password').value).toHaveLength(16);
  });

  it('tells a member why they cannot, without asking the server for anything', () => {
    auth.becomes('MEMBER');
    fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();

    http.expectNone(URL);
    expect(text()).toContain('Acceso restringido');
    expect(root().querySelector('form')).toBeNull();
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();
    http.expectOne((r) => r.url === URL).flush('x', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('No se pudieron cargar los miembros.');
  });

  it('is free of accessibility violations: the list and form, the limit reached, and the restricted view', async () => {
    await open(page([member()], 1, 5));
    await expectNoAxeViolations(root());
    fixture.destroy();

    await open(page([member()], 5, 5));
    await expectNoAxeViolations(root());
    fixture.destroy();

    auth.becomes('MEMBER');
    fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
