import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Panel } from './panel';

@Component({
  imports: [Panel],
  template: `
    <app-panel [heading]="heading()">
      <button panelActions type="button">Acción</button>
      <p>Contenido</p>
    </app-panel>
  `,
})
class Host {
  readonly heading = signal<string | undefined>('Título');
}

describe('Panel', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows the heading as an h2 and projects the body', () => {
    expect(root().querySelector('h2')?.textContent).toBe('Título');
    expect(root().querySelector('p')?.textContent).toBe('Contenido');
  });

  it('projects actions next to the heading', () => {
    expect(root().querySelector('[panelActions]')?.textContent).toBe('Acción');
  });

  it('omits the heading row entirely when there is no heading', () => {
    fixture.componentInstance.heading.set(undefined);
    fixture.detectChanges();

    expect(root().querySelector('h2')).toBeNull();
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
