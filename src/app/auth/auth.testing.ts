import { signal } from '@angular/core';
import { AuthSession, OrganizationRole } from './models/auth.models';
import { AuthService } from './services/auth.service';

export function sessionOf(role: OrganizationRole = 'OWNER', id = 'u-me'): AuthSession {
  return {
    user: { id, email: 'me@acme.test', fullName: 'Yo Mismo', role },
    organization: { id: 'tenant-1', code: 'acme', name: 'Acme' },
    subscription: { plan: 'PRO', maxProjects: 10, maxUsers: 10, maxStorageMB: 100 },
  };
}

/** Stands in for the signed-in user in screen specs: `TestBed.inject(AuthService) as unknown as FakeAuth` to change who it is. */
export class FakeAuth {
  readonly currentUser = signal<AuthSession | null>(sessionOf());

  getCurrentUser(): AuthSession['user'] | null {
    return this.currentUser()?.user ?? null;
  }

  becomes(role: OrganizationRole, id = 'u-me'): void {
    this.currentUser.set(sessionOf(role, id));
  }
}

export const provideFakeAuth = () => ({ provide: AuthService, useClass: FakeAuth });
