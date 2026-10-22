import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      heading="¿Eliminar WAR-1000?"
      confirmLabel="Sí, eliminar"
      [busy]="busy()"
      [(open)]="open"
      (confirm)="confirmed.set(confirmed() + 1)"
    >
      <p>También se eliminarán 2 elementos.</p>
    </app-confirm-dialog>
  `,
})
class Host {
  readonly open = signal(false);
  readonly busy = signal(false);
  readonly confirmed = signal(0);
}

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<Host>;
  const root = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('shows nothing until opened, then the consequences and both choices', () => {
    expect(root().textContent).not.toContain('También se eliminarán');

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(root().querySelector('h2')?.textContent).toContain('¿Eliminar WAR-1000?');
    expect(root().textContent).toContain('También se eliminarán 2 elementos.');
    expect(button('Cancelar')).toBeTruthy();
    expect(button('Sí, eliminar')).toBeTruthy();
  });

  it('emits confirm without closing by itself', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    button('Sí, eliminar').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.confirmed()).toBe(1);
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('cancels by closing, and disables the confirmation while busy', () => {
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    expect(button('Sí, eliminar').disabled).toBe(true);

    button('Cancelar').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.confirmed()).toBe(0);
  });

  it('has no axe violations while open', async () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
