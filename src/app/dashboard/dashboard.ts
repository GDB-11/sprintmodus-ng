import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { SUBSCRIPTION_PLAN_LABELS } from '../auth/models/auth.models';
import { PageHeader } from '../shared/ui/page-header/page-header';
import { TenantContextService } from '../tenant/services/tenant-context.service';

/** Landing page for signed-in users. Renders inside `app-shell` (Phase 16): no chrome of its own. */
@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
  protected readonly tenant = inject(TenantContextService).tenant;
  protected readonly planLabels = SUBSCRIPTION_PLAN_LABELS;

  /** Only owners and admins may customize workflows. */
  protected readonly canAdminister = computed(() => {
    const role = this.authService.currentUser()?.user.role;
    return role === 'OWNER' || role === 'ADMIN';
  });
}
