import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ShellSidebar } from './shell-sidebar';

describe('ShellSidebar', () => {
  let fixture: ComponentFixture<ShellSidebar>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellSidebar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ShellSidebar);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  async function loadUsage(): Promise<void> {
    http.expectOne(`${environment.apiUrl}/api/projects`).flush([{ projectCode: 'p1', name: 'Warehouse', key: 'WAR' }]);
    http.expectOne(`${environment.apiUrl}/api/users/count`).flush({ count: 3 });
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();
  }

  it('renders the navigation', () => {
    expect(root().querySelector('nav')).not.toBeNull();
  });

  it('shows the organization and its usage once loaded', async () => {
    await loadUsage();

    expect(root().textContent).toContain('Acme');
    expect(root().textContent).toContain('acme');
    expect(root().textContent).toContain('Proyectos');
    expect(root().textContent).toContain('1 / 10');
    expect(root().textContent).toContain('Usuarios');
    expect(root().textContent).toContain('3 / 10');
  });

  it('toggling collapses and expands the sidebar footer', async () => {
    await loadUsage();
    expect(root().querySelector('.border-t')).not.toBeNull();

    root().querySelector('button')!.click();
    fixture.detectChanges();

    expect(root().querySelector('.border-t')).toBeNull();
    expect(root().querySelector('button')?.getAttribute('aria-label')).toBe('Expandir la barra lateral');
  });

  it('passes axe', async () => {
    await loadUsage();
    await expectNoAxeViolations(root());
  });
});
