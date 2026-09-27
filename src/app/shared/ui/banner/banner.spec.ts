import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Banner, BannerKind } from './banner';

@Component({
  imports: [Banner],
  template: `<app-banner [kind]="kind()">Algo salió mal.</app-banner>`,
})
class Host {
  readonly kind = signal<BannerKind>('error');
}

describe('Banner', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const div = () => root().querySelector('div[role]')!;

  it('interrupts for error and warning (role=alert)', () => {
    fixture.componentInstance.kind.set('error');
    fixture.detectChanges();
    expect(div().getAttribute('role')).toBe('alert');

    fixture.componentInstance.kind.set('warning');
    fixture.detectChanges();
    expect(div().getAttribute('role')).toBe('alert');
  });

  it('does not interrupt for success and info (role=status)', () => {
    fixture.componentInstance.kind.set('success');
    fixture.detectChanges();
    expect(div().getAttribute('role')).toBe('status');

    fixture.componentInstance.kind.set('info');
    fixture.detectChanges();
    expect(div().getAttribute('role')).toBe('status');
  });

  it('shows the projected message', () => {
    expect(root().textContent).toContain('Algo salió mal.');
  });

  it('passes axe for every kind', async () => {
    for (const kind of ['error', 'success', 'info', 'warning'] as const) {
      fixture.componentInstance.kind.set(kind);
      fixture.detectChanges();
      await expectNoAxeViolations(root());
    }
  });
});
