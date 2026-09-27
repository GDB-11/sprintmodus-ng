import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `
    <button appButton [variant]="variant()" [size]="size()" [disabled]="disabled()" title="Motivo">Continuar</button>
    <a appButton href="/somewhere">Ir</a>
  `,
})
class Host {
  readonly variant = signal<'primary' | 'secondary' | 'destructive'>('primary');
  readonly size = signal<'normal' | 'compact' | 'icon'>('normal');
  readonly disabled = signal(false);
}

describe('Button (button[appButton], a[appButton])', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const button = () => root().querySelector('button')!;
  const link = () => root().querySelector('a')!;

  it('is a real native button and anchor, not a div', () => {
    expect(button().tagName).toBe('BUTTON');
    expect(link().tagName).toBe('A');
  });

  it('defaults to the primary look', () => {
    expect(button().className).toContain('bg-primary-700');
  });

  it('switches classes with variant and size', () => {
    fixture.componentInstance.variant.set('destructive');
    fixture.componentInstance.size.set('compact');
    fixture.detectChanges();

    expect(button().className).toContain('bg-error-800');
    expect(button().className).toContain('px-3');
  });

  it('supports the native disabled-with-a-reason pattern (disabled + title)', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
    expect(button().getAttribute('title')).toBe('Motivo');
  });

  it('passes axe for every variant', async () => {
    for (const variant of ['primary', 'secondary', 'destructive'] as const) {
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();
      await expectNoAxeViolations(root());
    }
  });
});
