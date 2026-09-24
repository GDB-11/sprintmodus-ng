import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './http-errors';

describe('apiErrorMessage', () => {
  it('shows the backend message of a client error', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'INVALID_TRANSITION', message: 'Cannot move from New to Done.' },
    });

    expect(apiErrorMessage(error)).toBe('Cannot move from New to Done.');
  });

  it('hides the details of a server error', () => {
    const error = new HttpErrorResponse({ status: 500, error: { message: 'SQL exploded' } });

    expect(apiErrorMessage(error, 'Could not save.')).toBe('Could not save.');
  });

  it('explains an unreachable server and an unavailable dependency', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach the server');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 503 }))).toContain('temporarily unavailable');
  });

  it('falls back for anything that is not an HTTP error', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
