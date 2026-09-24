import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthSession,
  LoginRequest,
  LoginResponse,
  RegisterOrganizationRequest,
} from '../models/auth.models';
import { normalizeOrganizationCode } from '../models/organization-code';
import { isJwtExpired } from '../utils/jwt';

const TOKEN_KEY = 'sprintmodus.token';
const SESSION_KEY = 'sprintmodus.session';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly authUrl = `${environment.apiUrl}/auth`;

  private readonly stored = this.restore();
  private readonly tokenState = signal<string | null>(this.stored?.token ?? null);
  private readonly sessionState = signal<AuthSession | null>(this.stored?.session ?? null);

  /** The signed-in user together with their organization and subscription. */
  readonly currentUser = this.sessionState.asReadonly();

  login(request: LoginRequest): Observable<LoginResponse> {
    const body: LoginRequest = {
      ...request,
      email: request.email.trim(),
      organizationCode: normalizeOrganizationCode(request.organizationCode),
    };

    return this.http.post<LoginResponse>(`${this.authUrl}/login`, body).pipe(
      tap(({ token, ...session }) => this.startSession(token, session)),
    );
  }

  registerOrganization(request: RegisterOrganizationRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/register-organization`, {
      ...request,
      organizationCode: normalizeOrganizationCode(request.organizationCode),
    });
  }

  /** URL used by the registration form to check a code before submitting. */
  organizationCodeAvailabilityUrl(code: string): string {
    const query = new URLSearchParams({ code: normalizeOrganizationCode(code) });
    return `${this.authUrl}/organization-code-available?${query}`;
  }

  logout(): void {
    this.endSession();
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenState();
  }

  getCurrentUser(): AuthSession['user'] | null {
    return this.sessionState()?.user ?? null;
  }

  isAuthenticated(): boolean {
    const token = this.tokenState();
    return token !== null && !isJwtExpired(token);
  }

  private startSession(token: string, session: AuthSession): void {
    this.tokenState.set(token);
    this.sessionState.set(session);
    this.write(TOKEN_KEY, token);
    this.write(SESSION_KEY, JSON.stringify(session));
  }

  private endSession(): void {
    this.tokenState.set(null);
    this.sessionState.set(null);
    this.remove(TOKEN_KEY);
    this.remove(SESSION_KEY);
  }

  /** Returns the persisted session, or clears storage if it is missing, corrupt or expired. */
  private restore(): { token: string; session: AuthSession } | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const session = localStorage.getItem(SESSION_KEY);
      if (token && session && !isJwtExpired(token)) {
        return { token, session: JSON.parse(session) as AuthSession };
      }
    } catch {
      // Storage unavailable or the stored session is corrupt: start signed out.
    }
    this.remove(TOKEN_KEY);
    this.remove(SESSION_KEY);
    return null;
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable: the session lives in memory only.
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }
}
