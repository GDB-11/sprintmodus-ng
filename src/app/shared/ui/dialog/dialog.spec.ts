import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Dialog } from './dialog';

@Component({
  imports: [Dialog],
  template: `
    <app-dialog heading="Importar" [(open)]="open">
      <p>Contenido</p>
    </app-dialog>
  `,
})
class Host {
  readonly open = signal(false);
}

describe('Dialog', () => {
  let fixture: ComponentFixture<Host>;
  const root = () => fixture.nativeElement as HTMLElement;
  const dialog = () => root().querySelector('dialog') as HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders no content while closed', () => {
    expect(root().textContent).not.toContain('Contenido');
    expect(dialog().hasAttribute('open')).toBe(false);
  });

  it('opens with its heading as the accessible name and the projected content', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(dialog().hasAttribute('open')).toBe(true);
    const heading = root().querySelector('h2')!;
    expect(dialog().getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toContain('Importar');
    expect(root().textContent).toContain('Contenido');
  });

  it('closes with its close button', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    (root().querySelector('button[aria-label="Cerrar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes when the backdrop is clicked, but not when its content is', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    root().querySelector('p')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);

    dialog().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('has no accessibility violations open', async () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    await expectNoAxeViolations(root());
  });
});
