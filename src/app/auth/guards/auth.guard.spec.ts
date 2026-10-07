import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

function run(guard: typeof authGuard, authenticated: boolean, url = '/dashboard') {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  vi.spyOn(TestBed.inject(AuthService), 'isAuthenticated').mockReturnValue(authenticated);
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

describe('guards', () => {
  it('authGuard lets authenticated users through', () => {
    expect(run(authGuard, true)).toBe(true);
  });

  it('authGuard redirects anonymous users to /login with the return URL', () => {
    const result = run(authGuard, false, '/projects/1?tab=board') as UrlTree;
    expect(result.toString()).toBe(
      '/login?returnUrl=%2Fprojects%2F1%3Ftab%3Dboard',
    );
  });

  it('guestGuard lets anonymous users through', () => {
    expect(run(guestGuard, false)).toBe(true);
  });

  it('guestGuard redirects authenticated users to the dashboard', () => {
    expect((run(guestGuard, true) as UrlTree).toString()).toBe('/dashboard');
  });
});
