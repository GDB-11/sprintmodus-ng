import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SUBSCRIPTION_PLAN_LABELS, SubscriptionPlan } from '../../../auth/models/auth.models';
import { AuthService } from '../../../auth/services/auth.service';
import { Permissions } from '../../../auth/services/permissions.service';
import { apiErrorMessage } from '../../../shared/http-errors';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { ConfirmInline } from '../../../shared/ui/confirm-inline/confirm-inline';
import { NotAllowed } from '../../../shared/ui/not-allowed/not-allowed';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Panel } from '../../../shared/ui/panel/panel';
import { PLAN_OFFERS, PLAN_ORDER, PlanChange, planChange } from '../../models/plan-catalog';
import { BillingService, PaymentDeclinedError } from '../../services/billing.service';
import { PaymentForm } from '../payment-form/payment-form';

/**
 * "Suscripción": compare plans, upgrade (with a simulated payment), downgrade or cancel (back to Free). The plan is kept by the backend; only the payment is simulated (see
 * `BillingService`). Only the owner may change it; anyone else is told why.
 */
@Component({
  selector: 'app-billing-page',
  imports: [PageHeader, Panel, Chip, Button, ConfirmInline, NotAllowed, PaymentForm],
  templateUrl: './billing-page.html',
  host: { class: 'mx-auto flex max-w-5xl flex-col gap-4' },
})
export class BillingPage {
  private readonly auth = inject(AuthService);
  private readonly billing = inject(BillingService);
  private readonly notifications = inject(NotificationService);

  protected readonly canManage = inject(Permissions).canManageBilling;

  protected readonly current = computed<SubscriptionPlan>(() => this.auth.currentUser()?.subscription.plan ?? 'FREE');
  protected readonly plans = PLAN_ORDER.map((plan) => ({
    plan,
    label: SUBSCRIPTION_PLAN_LABELS[plan],
    offer: PLAN_OFFERS[plan],
  }));

  /** The plan being paid for, the plan being confirmed (downgrade/cancel), and the work in flight. */
  protected readonly paying = signal<SubscriptionPlan | null>(null);
  protected readonly confirming = signal<SubscriptionPlan | 'CANCEL' | null>(null);
  protected readonly busy = signal(false);
  protected readonly paymentError = signal<string | null>(null);

  protected readonly payingLabel = computed(() => SUBSCRIPTION_PLAN_LABELS[this.paying() ?? 'FREE']);
  protected readonly payingPrice = computed(() => PLAN_OFFERS[this.paying() ?? 'FREE'].priceUsd);
  protected readonly confirmQuestion = computed(() => {
    const target = this.confirming();
    return target === 'CANCEL'
      ? '¿Cancelar la suscripción? La organización vuelve al plan Gratis y sus límites.'
      : `¿Cambiar al plan ${SUBSCRIPTION_PLAN_LABELS[target ?? 'FREE']}? Sus límites son menores.`;
  });

  protected changeFor(plan: SubscriptionPlan): PlanChange {
    return planChange(this.current(), plan);
  }

  protected actionLabel(plan: SubscriptionPlan, label: string): string {
    return this.changeFor(plan) === 'upgrade' ? `Mejorar a ${label}` : `Bajar a ${label}`;
  }

  protected choose(plan: SubscriptionPlan): void {
    this.paymentError.set(null);
    if (this.changeFor(plan) === 'upgrade') {
      this.confirming.set(null);
      this.paying.set(plan);
    } else {
      this.paying.set(null);
      this.confirming.set(plan);
    }
  }

  protected askCancel(): void {
    this.paying.set(null);
    this.confirming.set('CANCEL');
  }

  protected closeDialogs(): void {
    this.paying.set(null);
    this.confirming.set(null);
    this.paymentError.set(null);
  }

  protected async pay(payment: { cardNumber: string }): Promise<void> {
    const plan = this.paying();
    if (!plan) return;
    this.busy.set(true);
    this.paymentError.set(null);
    try {
      await firstValueFrom(this.billing.change(plan, payment));
      this.notifications.success(`Ahora tienes el plan ${SUBSCRIPTION_PLAN_LABELS[plan]}.`);
      this.closeDialogs();
    } catch (error) {
      this.paymentError.set(
        error instanceof PaymentDeclinedError
          ? 'El pago fue rechazado. Prueba con otra tarjeta.'
          : apiErrorMessage(error, 'No se pudo procesar el pago.'),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const target = this.confirming();
    if (!target) return;
    this.busy.set(true);
    try {
      const plan: SubscriptionPlan = target === 'CANCEL' ? 'FREE' : target;
      await firstValueFrom(target === 'CANCEL' ? this.billing.cancel() : this.billing.change(plan));
      this.notifications.success(
        target === 'CANCEL' ? 'Suscripción cancelada. Ahora tienes el plan Gratis.' : `Ahora tienes el plan ${SUBSCRIPTION_PLAN_LABELS[plan]}.`,
      );
      this.closeDialogs();
    } catch (error) {
      this.notifications.error(apiErrorMessage(error, 'No se pudo cambiar el plan.'));
    } finally {
      this.busy.set(false);
    }
  }
}
