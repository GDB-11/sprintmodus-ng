import { Service, inject } from '@angular/core';
import { Observable, delay, map, throwError } from 'rxjs';
import { SubscriptionPlan } from '../../auth/models/auth.models';
import { AuthService } from '../../auth/services/auth.service';
import { PLAN_OFFERS, SIMULATED_DECLINED_CARD } from '../models/plan-catalog';

const SIMULATED_LATENCY_MS = 900;

export interface SimulatedPayment {
  cardNumber: string;
}

export class PaymentDeclinedError extends Error {
  constructor() {
    super('El pago fue rechazado.');
  }
}

/**
 * The plan lives in the backend (`PUT /auth/subscription`, owner only), so every user of the organization sees it at
 * their next refresh. Only the payment is simulated: there is no card processor yet, so the card form is checked here
 * and a plan change is applied as asked. Put the real checkout in front of `change()` later; nothing else should move.
 */
@Service()
export class BillingService {
  private readonly auth = inject(AuthService);

  /** Moves the organization to `plan`. Paid plans need a (simulated) payment; Free never does. */
  change(plan: SubscriptionPlan, payment?: SimulatedPayment): Observable<void> {
    if (PLAN_OFFERS[plan].priceUsd > 0 && payment?.cardNumber.replace(/\s/g, '') === SIMULATED_DECLINED_CARD.replace(/\s/g, '')) {
      return throwError(() => new PaymentDeclinedError()).pipe(delay(SIMULATED_LATENCY_MS));
    }
    const request = this.auth.changePlan(plan).pipe(map(() => undefined));
    return PLAN_OFFERS[plan].priceUsd > 0 && payment ? request.pipe(delay(SIMULATED_LATENCY_MS)) : request;
  }

  /** Cancelling returns the organization to the Free plan. */
  cancel(): Observable<void> {
    return this.change('FREE');
  }
}
