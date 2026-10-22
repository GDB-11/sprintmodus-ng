import { Service, computed, inject } from '@angular/core';
import { OrganizationRole } from '../models/auth.models';
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

  /** The organization-level role of the signed-in user, for screens that say it. */
  readonly role = computed(() => this.auth.currentUser()?.user.role ?? null);

  /** Owners and admins: workflows, planning work into sprints, and the manual order of the cards on a board. */
  readonly canAdminister = computed(() => {
    const role = this.auth.currentUser()?.user.role;
    return role === 'OWNER' || role === 'ADMIN';
  });

  /** The roles the signed-in user may give to a new member: an owner adds admins and members, an admin adds members. */
  readonly grantableRoles = computed<readonly OrganizationRole[]>(() => {
    switch (this.auth.currentUser()?.user.role) {
      case 'OWNER':
        return ['ADMIN', 'MEMBER'];
      case 'ADMIN':
        return ['MEMBER'];
      default:
        return [];
    }
  });

  /** Setting a password for someone else follows the same hierarchy as granting a role; never for oneself. */
  canResetPasswordOf(member: { userCode: string; role: OrganizationRole }): boolean {
    return member.userCode !== this.userCode() && this.grantableRoles().includes(member.role);
  }

  /** Deactivating or reactivating someone follows the same hierarchy as granting a role; never oneself. */
  canSetActiveOf(member: { userCode: string; role: OrganizationRole }): boolean {
    return this.canResetPasswordOf(member);
  }

  /** Changing or cancelling the subscription is the owner's call. */
  readonly canManageBilling = computed(() => this.auth.currentUser()?.user.role === 'OWNER');

  readonly canAddUsers = computed(() => this.grantableRoles().length > 0);

  /** Deleting an item needs its creator or an owner/admin. */
  canDelete(item: { createdBy?: UserRef }): boolean {
    return this.canAdminister() || (!!item.createdBy && item.createdBy.userCode === this.userCode());
  }
}
