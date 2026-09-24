import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession, LoginResponse } from '../models/auth.models';
import { fakeJwt, stubLocalStorage } from '../utils/testing';
import { AuthService } from './auth.service';

const session: AuthSession = {
  user: { id: 'u-1', email: 'ana@acme.io', fullName: 'Ana', role: 'OWNER' },
  organization: { id: 't-1', code: 'acme', name: 'Acme' },
  subscription: { plan: 'FREE', maxProjects: 3, maxUsers: 5, maxStorageMB: 100 },
};
const validToken = () => fakeJwt({ exp: Date.now() / 1000 + 3600 });

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  return {
    service: TestBed.inject(AuthService),
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

describe('AuthService', () => {
  beforeEach(() => stubLocalStorage());

  it('logs in with a normalized organization code and stores the session', () => {
    const { service, http } = setup();
    const token = validToken();
    const response: LoginResponse = { ...session, token };

    service.login({ email: ' ana@acme.io ', password: 'secret', organizationCode: ' ACME ' })
      .subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({
      email: 'ana@acme.io',
      password: 'secret',
      organizationCode: 'acme',
    });
    req.flush(response);

    expect(service.getToken()).toBe(token);
    expect(service.currentUser()).toEqual(session);
    expect(service.getCurrentUser()).toEqual(session.user);
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('sprintmodus.token')).toBe(token);
  });

  it('does not store anything when login fails', () => {
    const { service, http } = setup();
    service.login({ email: 'a@b.io', password: 'x', organizationCode: 'acme' }).subscribe({
      error: () => undefined,
    });
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(null, { status: 401, statusText: '' });

    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('restores a valid persisted session', () => {
    localStorage.setItem('sprintmodus.token', validToken());
    localStorage.setItem('sprintmodus.session', JSON.stringify(session));

    const { service } = setup();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual(session);
  });

  it('discards an expired persisted session', () => {
    localStorage.setItem('sprintmodus.token', fakeJwt({ exp: 1 }));
    localStorage.setItem('sprintmodus.session', JSON.stringify(session));

    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('sprintmodus.token')).toBeNull();
  });

  it('discards a corrupt persisted session', () => {
    localStorage.setItem('sprintmodus.token', validToken());
    localStorage.setItem('sprintmodus.session', '{not json');

    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
  });

  it('logout clears state and redirects to /login', () => {
    localStorage.setItem('sprintmodus.token', validToken());
    localStorage.setItem('sprintmodus.session', JSON.stringify(session));
    const { service, router } = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('sprintmodus.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('builds the availability URL with a normalized, encoded code', () => {
    const { service } = setup();
    expect(service.organizationCodeAvailabilityUrl(' Acme-1 ')).toBe(
      `${environment.apiUrl}/auth/organization-code-available?code=acme-1`,
    );
  });
});
