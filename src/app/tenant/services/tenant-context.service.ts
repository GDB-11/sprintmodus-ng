import { Service, computed, inject } from '@angular/core';
import { SubscriptionPlan } from '../../auth/models/auth.models';
import { AuthService } from '../../auth/services/auth.service';

export interface TenantInfo {
  tenantId: string;
  organizationCode: string;
  organizationName: string;
  plan: SubscriptionPlan;
  maxProjects: number;
  maxUsers: number;
}

@Service()
export class TenantContextService {
  private readonly authService = inject(AuthService);

  /** Recomputed whenever the user signs in or out. */
  readonly tenant = computed<TenantInfo | null>(() => {
    const session = this.authService.currentUser();
    if (!session) {
      return null;
    }

    return {
      tenantId: session.organization.id,
      organizationCode: session.organization.code,
      organizationName: session.organization.name,
      plan: session.subscription.plan,
      maxProjects: session.subscription.maxProjects,
      maxUsers: session.subscription.maxUsers,
    };
  });

  readonly tenantId = computed(() => this.tenant()?.tenantId ?? null);
}
