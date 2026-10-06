import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { provideFakeBoard } from '../../../board/board.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { AppShell } from './app-shell';

@Component({ template: '<p>Contenido de la página</p>' })
class Page {}

describe('AppShell', () => {
  let fixture: ComponentFixture<AppShell>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: Page }]),
        provideFakeAuth(),
        provideFakeBoard(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  async function loadProjects() {
    http.expectOne(`${environment.apiUrl}/api/projects`).flush([{ projectCode: 'p1', name: 'Warehouse', key: 'WAR' }]);
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();
  }

  it('has exactly one <main>, and it is where the routed page renders', () => {
    const mains = root().querySelectorAll('main');
    expect(mains.length).toBe(1);
    expect(mains[0].id).toBe('main-content');
    expect(mains[0].textContent).toContain('Contenido de la página');
  });

  it('has skip links to the content and the navigation', () => {
    const links = Array.from(root().querySelectorAll('a')).filter((a) => a.textContent?.startsWith('Saltar'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#main-content', '#shell-nav']);
  });

  it('has one navigation landmark, the id the skip link points to', () => {
    expect(root().querySelector('#shell-nav')?.tagName.toLowerCase()).toBe('aside');
  });

  it('opens the drawer from the top bar hamburger', () => {
    root().querySelector('button[aria-label="Abrir la navegación"]')!.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    const drawerDialog = root().querySelector('app-shell-drawer dialog') as HTMLDialogElement;
    expect(drawerDialog.open).toBe(true);
  });

  it('passes axe', async () => {
    await loadProjects();
    await expectNoAxeViolations(root());
  });
});
