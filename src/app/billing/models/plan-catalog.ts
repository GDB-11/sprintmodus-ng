import { AuthSession, SubscriptionPlan } from '../../auth/models/auth.models';

export interface PlanOffer {
  /** Monthly price in USD; 0 is free. */
  priceUsd: number;
  limits: AuthSession['subscription'];
  /** Short plain-text highlights, in Spanish (UI text). */
  highlights: readonly string[];
}

/** Same limits the backend's `Plan` enum assigns at onboarding. Order below is also the upgrade order. */
export const PLAN_ORDER: readonly SubscriptionPlan[] = ['FREE', 'PRO', 'ENTERPRISE'];

export const PLAN_OFFERS: Record<SubscriptionPlan, PlanOffer> = {
  FREE: {
    priceUsd: 0,
    limits: { plan: 'FREE', maxProjects: 1, maxUsers: 5, maxStorageMB: 100 },
    highlights: ['1 proyecto', 'Hasta 5 usuarios', '100 MB de almacenamiento'],
  },
  PRO: {
    priceUsd: 29,
    limits: { plan: 'PRO', maxProjects: 10, maxUsers: 50, maxStorageMB: 5000 },
    highlights: ['Hasta 10 proyectos', 'Hasta 50 usuarios', '5 GB de almacenamiento'],
  },
  ENTERPRISE: {
    priceUsd: 99,
    limits: { plan: 'ENTERPRISE', maxProjects: 999, maxUsers: 999, maxStorageMB: 100000 },
    highlights: ['Proyectos ilimitados', 'Usuarios ilimitados', '100 GB de almacenamiento'],
  },
};

export type PlanChange = 'upgrade' | 'downgrade' | 'same';

export function planChange(from: SubscriptionPlan, to: SubscriptionPlan): PlanChange {
  const delta = PLAN_ORDER.indexOf(to) - PLAN_ORDER.indexOf(from);
  return delta > 0 ? 'upgrade' : delta < 0 ? 'downgrade' : 'same';
}

/** What the simulated card form accepts; there is no card processor behind it. */
export const SIMULATED_APPROVED_CARD = '4242 4242 4242 4242';
export const SIMULATED_DECLINED_CARD = '4000 0000 0000 0002';
