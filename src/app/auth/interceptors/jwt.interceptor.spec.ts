import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

function setup(token: string | null) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([jwtInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  const auth = TestBed.inject(AuthService);
  vi.spyOn(auth, 'getToken').mockReturnValue(token);
  const logout = vi.spyOn(auth, 'logout').mockImplementation(() => undefined);
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    logout,
  };
}

const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('jwtInterceptor', () => {
  it('attaches the bearer token to gateway requests', () => {
    const { http, controller } = setup('abc');
    http.get(`${environment.apiUrl}/api/projects`).subscribe();
    expect(controller.expectOne(`${environment.apiUrl}/api/projects`).request.headers.get('Authorization'))
      .toBe('Bearer abc');
  });

  it('sends no Authorization header without a token', () => {
    const { http, controller } = setup(null);
    http.get(`${environment.apiUrl}/api/projects`).subscribe();
    expect(controller.expectOne(`${environment.apiUrl}/api/projects`).request.headers.has('Authorization'))
      .toBe(false);
  });

  it('never sends the token to other origins', () => {
    const { http, controller } = setup('abc');
    http.get('https://example.com/data').subscribe();
    expect(controller.expectOne('https://example.com/data').request.headers.has('Authorization'))
      .toBe(false);
  });

  it('logs out on 401 from a protected endpoint', () => {
    const { http, controller, logout } = setup('abc');
    http.get(`${environment.apiUrl}/api/projects`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiUrl}/api/projects`).flush(null, unauthorized);
    expect(logout).toHaveBeenCalledOnce();
  });

  it('does not log out on 401 from login (bad credentials) or send a token there', () => {
    const { http, controller, logout } = setup('stale');
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe({ error: () => undefined });
    const req = controller.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, unauthorized);
    expect(logout).not.toHaveBeenCalled();
  });

  it('does not log out on non-401 errors', () => {
    const { http, controller, logout } = setup('abc');
    http.get(`${environment.apiUrl}/api/projects`).subscribe({ error: () => undefined });
    controller
      .expectOne(`${environment.apiUrl}/api/projects`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(logout).not.toHaveBeenCalled();
  });
});
