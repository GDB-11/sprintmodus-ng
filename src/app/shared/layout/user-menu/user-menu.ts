import { OverlayModule } from '@angular/cdk/overlay';
import { Component, computed, inject, signal } from '@angular/core';
import { ORGANIZATION_ROLE_LABELS, SUBSCRIPTION_PLAN_LABELS } from '../../../auth/models/auth.models';
import { AuthService } from '../../../auth/services/auth.service';
import { TenantContextService } from '../../../tenant/services/tenant-context.service';
import { Avatar } from '../../ui/avatar/avatar';
import { Icon } from '../../ui/icon/icon';
import { Popover } from '../../ui/popover/popover';

/** Who is signed in, their role, the organization and plan, and the way out. */
@Component({
  selector: 'app-user-menu',
  imports: [OverlayModule, Avatar, Icon, Popover],
  templateUrl: './user-menu.html',
})
export class UserMenu {
  private readonly auth = inject(AuthService);
  protected readonly tenant = inject(TenantContextService).tenant;

  protected readonly open = signal(false);
  protected readonly user = computed(() => this.auth.currentUser()?.user ?? null);
  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ORGANIZATION_ROLE_LABELS[role] : '';
  });
  protected readonly planLabel = computed(() => {
    const plan = this.tenant()?.plan;
    return plan ? SUBSCRIPTION_PLAN_LABELS[plan] : '';
  });

  protected logout(): void {
    this.open.set(false);
    this.auth.logout();
  }
}
