import { Observable, of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FakeAuth, provideFakeAuth, sessionOf } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { BillingService } from '../../services/billing.service';
import { BillingPage } from './billing-page';

describe('BillingPage', () => {
  let fixture: ComponentFixture<BillingPage>;
  let auth: FakeAuth;
  const applied: string[] = [];

  beforeEach(async () => {
    applied.length = 0;
    await TestBed.configureTestingModule({
      imports: [BillingPage],
      providers: [provideFakeAuth()],
    }).compileComponents();
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    (auth as unknown as { changePlan: (plan: string) => Observable<void> }).changePlan = (plan) => {
      applied.push(plan);
      auth.currentUser.set({ ...sessionOf(), subscription: { ...sessionOf().subscription, plan } } as never);
      return of(undefined);
    };
    fixture = TestBed.createComponent(BillingPage);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(root().querySelectorAll('button')).find((b) => b.textContent!.includes(label))!;

  it('marks the current plan and offers the others', () => {
    expect(text()).toContain('Plan actual');
    expect(button('Mejorar a Empresarial')).toBeTruthy();
    expect(button('Bajar a Gratis')).toBeTruthy();
  });

  it('refuses anyone but the owner, with the reason', () => {
    auth.becomes('ADMIN');
    fixture.detectChanges();
    expect(text()).toContain('Solo el propietario');
    expect(root().querySelector('button')).toBeNull();
  });

  it('upgrades after an approved simulated payment', async () => {
    button('Mejorar a Empresarial').click();
    fixture.detectChanges();
    const set = (id: string, value: string) => {
      const input = root().querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('card-name', 'Ana Pérez');
    set('card-number', '4242 4242 4242 4242');
    set('card-expiry', '12/30');
    set('card-cvc', '123');
    root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(applied).toEqual(['ENTERPRISE']));
  });

  it('shows the rejection and keeps the plan when the card is declined', async () => {
    button('Mejorar a Empresarial').click();
    fixture.detectChanges();
    const set = (id: string, value: string) => {
      const input = root().querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('card-name', 'Ana Pérez');
    set('card-number', '4000 0000 0000 0002');
    set('card-expiry', '12/30');
    set('card-cvc', '123');
    root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(text()).toContain('El pago fue rechazado');
    });
    expect(applied).toEqual([]);
  });

  it('cancels back to Free after confirming', async () => {
    button('Cancelar suscripción').click();
    fixture.detectChanges();
    button('Sí, cancelar suscripción').click();
    await vi.waitFor(() => expect(applied).toEqual(['FREE']));
  });

  it('has no axe violations', async () => {
    await expectNoAxeViolations(root());
  });

  it('provides the service', () => {
    expect(TestBed.inject(BillingService)).toBeTruthy();
  });
});
