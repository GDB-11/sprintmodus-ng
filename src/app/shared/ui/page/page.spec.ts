import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Page } from './page';

@Component({
  imports: [Page],
  template: `
    <app-page heading="Elementos de trabajo" [backLink]="['/dashboard']">
      <p>Cuerpo</p>
    </app-page>
  `,
})
class Host {}

describe('Page (Phase 16 adapter)', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('renders no <main> of its own: the shell owns that landmark', () => {
    expect(root().querySelector('main')).toBeNull();
  });

  it('delegates the heading and back link to app-page-header', () => {
    expect(root().querySelector('h1')?.textContent).toBe('Elementos de trabajo');
    expect(root().querySelector('a')?.getAttribute('href')).toBe('/dashboard');
  });

  it('projects its content', () => {
    expect(root().querySelector('p')?.textContent).toBe('Cuerpo');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
