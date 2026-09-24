import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { TenantContextService } from '../tenant/services/tenant-context.service';

/** Placeholder landing page for signed-in users; replaced by the real work-item views in Phase 5. */
@Component({
  selector: 'app-dashboard',
  template: `
    <main class="min-h-screen bg-light-bg p-6 text-neutral-900 dark:bg-dark-bg dark:text-neutral-100">
      <div class="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 class="text-2xl font-semibold">Dashboard</h1>
        @if (tenant(); as tenant) {
          <p>
            Signed in as {{ authService.getCurrentUser()?.fullName }} in
            <strong>{{ tenant.organizationName }}</strong> ({{ tenant.organizationCode }}) on the
            {{ tenant.plan }} plan: up to {{ tenant.maxProjects }} projects and
            {{ tenant.maxUsers }} users.
          </p>
        }
        <div>
          <button
            type="button"
            (click)="authService.logout()"
            class="rounded-md bg-primary-500 px-4 py-2.5 font-semibold text-neutral-900 hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-900 dark:focus-visible:outline-secondary-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  `,
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
  protected readonly tenant = inject(TenantContextService).tenant;
}
