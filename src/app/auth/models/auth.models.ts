export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
};

export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE';

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: 'Gratis',
  PRO: 'Pro',
  ENTERPRISE: 'Empresarial',
};

export interface LoginRequest {
  email: string;
  password: string;
  /** Short owner-chosen code (e.g. `acme`), never the tenant UUID. */
  organizationCode: string;
}

/** Session data returned by `POST /auth/login`, without the token. */
export interface AuthSession {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: OrganizationRole;
  };
  organization: {
    /** Internal tenant UUID (`tenantId` in the JWT). */
    id: string;
    code: string;
    name: string;
  };
  subscription: {
    plan: SubscriptionPlan;
    maxProjects: number;
    maxUsers: number;
    maxStorageMB: number;
  };
}

export interface LoginResponse extends AuthSession {
  token: string;
}

export interface RegisterOrganizationRequest {
  organizationName: string;
  organizationCode: string;
  fullName: string;
  email: string;
  password: string;
}

export interface OrganizationCodeAvailability {
  available: boolean;
  /** Error code explaining why the code cannot be used; absent when it is available. */
  reason?: 'ORGANIZATION_CODE_TAKEN' | 'ORGANIZATION_CODE_RESERVED' | 'INVALID_ORGANIZATION_CODE';
}
