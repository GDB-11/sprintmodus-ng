import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { provideFakeBoard } from '../../../board/board.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ShellTopbar } from './shell-topbar';

describe('ShellTopbar', () => {
  let fixture: ComponentFixture<ShellTopbar>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellTopbar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideFakeAuth(), provideFakeBoard()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ShellTopbar);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  async function loadProjects(projects: { projectCode: string; name: string; key: string }[] = [{ projectCode: 'p1', name: 'Warehouse', key: 'WAR' }]) {
    http.expectOne(`${environment.apiUrl}/api/projects`).flush(projects);
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();
  }

  it('has exactly one header landmark', () => {
    expect(root().querySelectorAll('header').length).toBe(1);
  });

  it('emits menuToggle from the hamburger', () => {
    let emitted = 0;
    fixture.componentInstance.menuToggle.subscribe(() => emitted++);

    root().querySelector('button[aria-label="Abrir la navegación"]')!.dispatchEvent(new MouseEvent('click'));

    expect(emitted).toBe(1);
  });

  it('links "+ Nuevo" to creating a work item', () => {
    const link = Array.from(root().querySelectorAll('a')).find((a) => a.getAttribute('href') === '/work-items/new');
    expect(link).not.toBeUndefined();
  });

  it('shows the connection indicator only once a project is current', async () => {
    expect(root().querySelector('app-connection-indicator')).toBeNull();

    await loadProjects();

    expect(root().querySelector('app-connection-indicator')).not.toBeNull();
  });

  it('opens the search palette from its trigger button', () => {
    root().querySelector('button[aria-label^="Buscar"]')!.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    const dialog = root().querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
  });

  it('passes axe', async () => {
    await loadProjects();
    await expectNoAxeViolations(root());
  });
});
