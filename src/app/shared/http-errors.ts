import { HttpErrorResponse } from '@angular/common/http';

/**
 * What to tell the user about a failed API call. The backend words its 4xx messages for people (`{code, message}`), so
 * those are shown as they are; anything else gets the fallback. A 402 or 5xx never leaks internals.
 */
export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error. Inténtalo de nuevo.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    if (error.status === 503) {
      return 'Un servicio necesario no está disponible por el momento. Inténtalo de nuevo en unos minutos.';
    }
    const message = (error.error as { message?: unknown } | null)?.message;
    if (error.status >= 400 && error.status < 500 && typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
}
