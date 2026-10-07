import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protects authenticated routes; sends anonymous users to `/login` and remembers where they were going. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (inject(AuthService).isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from the login and registration pages. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
