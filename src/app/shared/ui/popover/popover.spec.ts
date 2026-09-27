import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Popover } from './popover';

@Component({
  imports: [Popover, OverlayModule],
  template: `
    <button cdkOverlayOrigin #trigger="cdkOverlayOrigin" type="button" (click)="open.set(!open())">Abrir</button>
    <app-popover [origin]="trigger" [(open)]="open" label="Notificaciones">
      <p>Contenido</p>
      <button type="button">Dentro</button>
    </app-popover>
  `,
})
class Host {
  readonly open = signal(false);
}

describe('Popover', () => {
  let fixture: ComponentFixture<Host>;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  const trigger = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;
  const dialog = () => overlayContainerElement.querySelector('[role="dialog"]');

  it('renders nothing until opened', () => {
    expect(dialog()).toBeNull();
  });

  it('opens on the trigger, labelled, with the projected content', () => {
    trigger().click();
    fixture.detectChanges();

    expect(dialog()?.getAttribute('aria-label')).toBe('Notificaciones');
    expect(dialog()?.textContent).toContain('Contenido');
  });

  it('closes on Escape', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    dialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes on an outside click', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const backdrop = overlayContainerElement.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    backdrop.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('passes axe while open', async () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await expectNoAxeViolations(overlayContainerElement);
  });
});
