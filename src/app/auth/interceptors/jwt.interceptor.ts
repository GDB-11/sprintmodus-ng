import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Endpoints that need no token; a 401 from them means bad credentials, not an expired session. */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register-organization',
  '/auth/organization-code-available',
];

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const isGatewayRequest = request.url.startsWith(environment.apiUrl);
  if (!isGatewayRequest) {
    return next(request);
  }

  const authService = inject(AuthService);
  const path = request.url.slice(environment.apiUrl.length).split('?')[0];
  const isPublic = PUBLIC_PATHS.includes(path);

  const token = authService.getToken();
  const authorizedRequest =
    token && !isPublic
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublic) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
