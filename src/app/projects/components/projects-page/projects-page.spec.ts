import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FakeAuth, provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { project } from '../../projects.testing';
import { ProjectsPage } from './projects-page';

const URL = `${environment.apiUrl}/api/projects`;

describe('ProjectsPage', () => {
  let fixture: ComponentFixture<ProjectsPage>;
  let http: HttpTestingController;
  let auth: FakeAuth;
  const root = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.replace(/\s+/g, ' ').trim() === label);

  async function open(role: 'OWNER' | 'MEMBER' = 'OWNER'): Promise<void> {
    auth.becomes(role);
    fixture = TestBed.createComponent(ProjectsPage);
    fixture.detectChanges();
    http.expectOne(URL).flush([project(), project({ projectCode: 'p2', name: 'Billing', key: 'BIL' })]);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as unknown as FakeAuth;
  });

  afterEach(() => http.verify());

  it('asks before deleting a project, then deletes it and reloads the list', async () => {
    await open();

    button('Eliminar Billing')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    http.expectNone(`${URL}/p2`);
    const dialog = [...document.querySelectorAll('dialog')].find((d) => d.textContent!.includes('¿Eliminar Billing?'))!;
    expect(dialog.textContent).toContain('todos sus sprints');

    [...dialog.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Sí, eliminar proyecto')!.click();
    const request = http.expectOne(`${URL}/p2`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    (await vi.waitFor(() => http.expectOne(URL))).flush([project()]);
    await fixture.whenStable();
  });

  it('shows delete disabled with the reason to a member, who can still edit', async () => {
    await open('MEMBER');

    const del = button('Eliminar Billing')!;
    expect(del.disabled).toBe(true);
    expect(del.title).toContain('propietario o un administrador');
    expect(button('Editar Billing')!.disabled).toBe(false);
  });

  it('edits a project through the dialog and reloads the list', async () => {
    await open();

    button('Editar Billing')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const name = document.querySelector<HTMLInputElement>('#project-edit-name')!;
    expect(name.value).toBe('Billing');
    name.value = 'Facturación';
    name.dispatchEvent(new Event('input'));
    document.querySelector('dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    const request = await vi.waitFor(() => http.expectOne(`${URL}/p2`));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Facturación' });
    request.flush(project({ projectCode: 'p2', name: 'Facturación', key: 'BIL' }));
    (await vi.waitFor(() => http.expectOne(URL))).flush([project()]);
    await fixture.whenStable();
  });

  it('has no axe violations', async () => {
    await open();
    await expectNoAxeViolations(root());
  });
});
