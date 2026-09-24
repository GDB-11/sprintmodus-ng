import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeJwt, stubLocalStorage } from '../../auth/utils/testing';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  beforeEach(() => stubLocalStorage());

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return TestBed.inject(TenantContextService);
  }

  it('is null when signed out', () => {
    const service = setup();
    expect(service.tenant()).toBeNull();
    expect(service.tenantId()).toBeNull();
  });

  it('derives tenant info from the stored session', () => {
    localStorage.setItem('sprintmodus.token', fakeJwt({ exp: Date.now() / 1000 + 3600 }));
    localStorage.setItem(
      'sprintmodus.session',
      JSON.stringify({
        user: { id: 'u-1', email: 'ana@acme.io', fullName: 'Ana', role: 'OWNER' },
        organization: { id: 't-1', code: 'acme', name: 'Acme' },
        subscription: { plan: 'PRO', maxProjects: 10, maxUsers: 25, maxStorageMB: 5000 },
      }),
    );

    const service = setup();

    expect(service.tenant()).toEqual({
      tenantId: 't-1',
      organizationCode: 'acme',
      organizationName: 'Acme',
      plan: 'PRO',
      maxProjects: 10,
      maxUsers: 25,
    });
    expect(service.tenantId()).toBe('t-1');
  });
});
