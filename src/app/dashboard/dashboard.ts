import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { SubscriptionPlan } from '../auth/models/auth.models';
import { TenantContextService } from '../tenant/services/tenant-context.service';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: 'Gratis',
  PRO: 'Pro',
  ENTERPRISE: 'Empresarial',
};

/** Landing page for signed-in users. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
  protected readonly tenant = inject(TenantContextService).tenant;
  protected readonly planLabels = PLAN_LABELS;

  /** Only owners and admins may customize workflows. */
  protected readonly canAdminister = computed(() => {
    const role = this.authService.currentUser()?.user.role;
    return role === 'OWNER' || role === 'ADMIN';
  });
}
