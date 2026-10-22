import { OrganizationRole } from '../../auth/models/auth.models';
import { ChipTone } from '../../shared/ui/chip/chip';

/** A person of the organization as `GET /auth/users` lists them; never a hash or an internal id. */
export interface Member {
  userCode: string;
  fullName: string;
  email: string;
  role: OrganizationRole;
  isActive: boolean;
  /** ISO instant, or `null` when the person has never signed in. */
  lastLoginAt: string | null;
}

/** One page of members plus the seats: `count` active users of the plan's `maxUsers`. */
export interface MemberPage {
  items: Member[];
  page: number;
  size: number;
  total: number;
  count: number;
  maxUsers: number;
}

export interface CreateMemberRequest {
  fullName: string;
  email: string;
  role: OrganizationRole;
  password: string;
}

/** Server error code when the current password given to change one's own is wrong. */
export const WRONG_CURRENT_PASSWORD = 'WRONG_CURRENT_PASSWORD';

/** Role -> look of its chip (domain -> look map, read by `app-member-list`). */
export const ROLE_TONES: Record<OrganizationRole, ChipTone> = {
  OWNER: 'info',
  ADMIN: 'success',
  MEMBER: 'neutral',
};

/** Server error code when the plan has no seat left, including when someone else took the last one. */
export const USER_LIMIT_REACHED = 'USER_LIMIT_REACHED';
