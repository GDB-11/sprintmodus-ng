import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ShellBreadcrumb } from './shell-breadcrumb';

@Component({ template: '' })
class Dummy {}

describe('ShellBreadcrumb', () => {
  let fixture: ComponentFixture<ShellBreadcrumb>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellBreadcrumb],
      providers: [
        provideRouter([
          { path: 'dashboard', component: Dummy, data: { breadcrumb: 'Panel' } },
          { path: 'work-items', component: Dummy, data: { breadcrumb: 'Elementos de trabajo' } },
          { path: 'plain', component: Dummy },
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ShellBreadcrumb);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const items = () => Array.from(root().querySelectorAll('li')).map((li) => li.textContent);

  it('shows nothing before the route carries a breadcrumb', () => {
    expect(items()).toEqual([]);
  });

  it('shows the crumb of the current route', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    expect(items()).toEqual(['Panel']);
  });

  it('updates when navigating to a different section', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    await router.navigateByUrl('/work-items');
    fixture.detectChanges();

    expect(items()).toEqual(['Elementos de trabajo']);
  });

  it('shows nothing for a route with no breadcrumb data', async () => {
    await router.navigateByUrl('/plain');
    fixture.detectChanges();

    expect(items()).toEqual([]);
  });

  it('passes axe', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
