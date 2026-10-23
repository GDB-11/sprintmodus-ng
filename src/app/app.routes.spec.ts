import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { FakeAuth, provideFakeAuth } from './auth/auth.testing';
import { AuthService } from './auth/services/auth.service';
import { OrganizationRole } from './auth/models/auth.models';

@Component({ template: '' })
class Stub {}

/** The real route tree (paths, guards, redirects, nesting), with every lazy screen swapped for an empty component. */
function stubbed(tree: Routes): Routes {
  return tree.map((route) => {
    const { loadComponent, loadChildren, children, ...rest } = route;
    return {
      ...rest,
      ...(loadComponent || loadChildren ? { loadComponent: async () => Stub } : {}),
      ...(children ? { children: stubbed(children) } : {}),
    };
  });
}

describe('app routes', () => {
  async function open(url: string, role: OrganizationRole | null) {
    TestBed.configureTestingModule({ providers: [provideRouter(stubbed(routes)), provideFakeAuth()] });
    const auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    if (role) auth.becomes(role);
    else auth.currentUser.set(null);
    await RouterTestingHarness.create(url);
    return TestBed.inject(Router).url;
  }

  it.each<OrganizationRole>(['OWNER', 'ADMIN', 'MEMBER'])('sends a signed-in %s from "/" to /dashboard', async (role) => {
    expect(await open('/', role)).toBe('/dashboard');
  });

  it('sends an unknown path to /dashboard', async () => {
    expect(await open('/nope', 'MEMBER')).toBe('/dashboard');
  });

  it('sends an anonymous visitor from "/" to the login page', async () => {
    expect(await open('/', null)).toBe('/login?returnUrl=%2Fdashboard');
  });
});
