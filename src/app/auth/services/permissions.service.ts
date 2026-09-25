import { Service, computed, inject } from '@angular/core';
import { UserRef } from '../../work-items/models/work-item.models';
import { AuthService } from './auth.service';

/**
 * What the signed-in user may do, so screens can show what they cannot as read-only instead of offering it. The backend
 * enforces every one of these: hiding a control here is a courtesy, never the protection.
 */
@Service()
export class Permissions {
  private readonly auth = inject(AuthService);

  readonly userCode = computed(() => this.auth.currentUser()?.user.id ?? null);

  /** Owners and admins: workflows, planning work into sprints, and the manual order of the cards on a board. */
  readonly canAdminister = computed(() => {
    const role = this.auth.currentUser()?.user.role;
    return role === 'OWNER' || role === 'ADMIN';
  });

  /** Deleting an item needs its creator or an owner/admin. */
  canDelete(item: { createdBy?: UserRef }): boolean {
    return this.canAdminister() || (!!item.createdBy && item.createdBy.userCode === this.userCode());
  }
}
