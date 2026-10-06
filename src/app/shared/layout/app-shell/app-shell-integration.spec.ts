import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { provideFakeBoard } from '../../../board/board.testing';
import { WorkItemList } from '../../../work-items/components/work-item-list/work-item-list';
import { expectNoAxeViolations } from '../../../testing/axe';
import { AppShell } from './app-shell';

/**
 * A real (Phase 5) screen rendered through the Phase 16 shell, the way `app.routes.ts` wires every authenticated route:
 * checks the two never overlap (one `<h1>`, one `<main>`) and that the combination is still keyboard/screen-reader clean.
 */
describe('AppShell (with a real screen inside it)', () => {
  let fixture: ComponentFixture<AppShell>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', children: [{ path: 'work-items', component: WorkItemList }] }]),
        provideFakeAuth(),
        provideFakeBoard(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    await TestBed.inject(Router).navigateByUrl('/work-items');
    fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  const root = () => fixture.nativeElement as HTMLElement;

  async function settle(): Promise<void> {
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();
  }

  /**
   * Two independent `GET /api/projects` calls are expected here on purpose: the shell's `ProjectContextService` (via
   * `project-switcher`) and this not-yet-migrated screen's own project select each fetch it separately until Phase 17
   * moves the screen onto the shared context.
   */
  async function loadScreen(): Promise<void> {
    for (const request of http.match((r) => r.url === `${environment.apiUrl}/api/projects`)) {
      request.flush([{ projectCode: 'p1', name: 'Warehouse', key: 'WAR' }]);
    }
    await settle();
    http.expectOne((r) => r.url === `${environment.apiUrl}/api/work-items`).flush({ items: [], total: 0, page: 0, size: 25 });
    await settle();
    await settle();
  }

  it('has exactly one <h1>, from the screen, and one <main>, from the shell', async () => {
    await loadScreen();

    expect(root().querySelectorAll('h1').length).toBe(1);
    expect(root().querySelectorAll('main').length).toBe(1);
    expect(root().querySelector('h1')?.textContent).toBe('Elementos de trabajo');
  });

  it('passes axe with a real screen mounted', async () => {
    await loadScreen();

    await expectNoAxeViolations(root());
  });
});
