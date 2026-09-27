import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../testing/axe';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header heading="Elementos de trabajo" [backLink]="['/dashboard']">
      <button pageHeaderActions type="button">Nuevo</button>
      <p>Cuerpo</p>
    </app-page-header>
  `,
})
class Host {}

describe('PageHeader', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('renders exactly one h1 with the heading', () => {
    const h1s = root().querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe('Elementos de trabajo');
  });

  it('shows the back link when given one', () => {
    expect(root().querySelector('a')?.getAttribute('href')).toBe('/dashboard');
  });

  it('projects actions and body content', () => {
    expect(root().querySelector('[pageHeaderActions]')?.textContent).toBe('Nuevo');
    expect(root().querySelector('p')?.textContent).toBe('Cuerpo');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
