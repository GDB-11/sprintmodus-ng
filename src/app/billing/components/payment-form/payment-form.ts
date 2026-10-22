import { Component, computed, input, output, signal } from '@angular/core';
import { form, FormRoot, required, validate } from '@angular/forms/signals';
import { notBlank } from '../../../shared/not-blank';
import { Banner } from '../../../shared/ui/banner/banner';
import { Button } from '../../../shared/ui/button/button';
import { Panel } from '../../../shared/ui/panel/panel';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SIMULATED_APPROVED_CARD, SIMULATED_DECLINED_CARD } from '../../models/plan-catalog';

interface PaymentModel {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

/** The simulated checkout: nothing typed here leaves the browser or is stored. Replace with the real processor later. */
@Component({
  selector: 'app-payment-form',
  imports: [FormRoot, TextField, Panel, Banner, Button],
  templateUrl: './payment-form.html',
})
export class PaymentForm {
  readonly planLabel = input.required<string>();
  readonly priceUsd = input.required<number>();
  readonly busy = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly paid = output<{ cardNumber: string }>();
  readonly cancel = output<void>();

  protected readonly approvedCard = SIMULATED_APPROVED_CARD;
  protected readonly declinedCard = SIMULATED_DECLINED_CARD;
  protected readonly heading = computed(() => `Pago de ${this.planLabel()}`);

  private readonly model = signal<PaymentModel>({ cardName: '', cardNumber: '', expiry: '', cvc: '' });

  protected readonly paymentForm = form(
    this.model,
    (path) => {
      required(path.cardName, { message: 'Ingresa el nombre de la tarjeta.' });
      notBlank(path.cardName, 'Ingresa el nombre de la tarjeta.');
      required(path.cardNumber, { message: 'Ingresa el número de tarjeta.' });
      validate(path.cardNumber, ({ value }) =>
        /^\d{16}$/.test(value().replace(/\s/g, '')) ? null : { kind: 'card', message: 'Usa 16 dígitos.' },
      );
      required(path.expiry, { message: 'Ingresa el vencimiento.' });
      validate(path.expiry, ({ value }) =>
        /^(0[1-9]|1[0-2])\/\d{2}$/.test(value().trim()) ? null : { kind: 'expiry', message: 'Usa el formato MM/AA.' },
      );
      required(path.cvc, { message: 'Ingresa el código de seguridad.' });
      validate(path.cvc, ({ value }) =>
        /^\d{3,4}$/.test(value().trim()) ? null : { kind: 'cvc', message: 'Usa 3 o 4 dígitos.' },
      );
    },
    {
      submission: {
        action: async () => {
          if (this.busy()) return undefined;
          this.paid.emit({ cardNumber: this.model().cardNumber });
          return undefined;
        },
      },
    },
  );
}
