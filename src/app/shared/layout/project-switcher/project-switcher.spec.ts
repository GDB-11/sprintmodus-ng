import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ProjectSwitcher } from './project-switcher';

@Component({ template: '' })
class Dummy {}

describe('ProjectSwitcher', () => {
  let fixture: ComponentFixture<ProjectSwitcher>;
  let http: HttpTestingController;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectSwitcher],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: Dummy }]),
        provideFakeAuth(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(ProjectSwitcher);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(OverlayContainer).ngOnDestroy());

  const root = () => fixture.nativeElement as HTMLElement;
  const trigger = () => root().querySelector('button')!;
  const menu = () => overlayContainerElement.querySelector('[role="listbox"]');

  async function loadProjects(): Promise<void> {
    http
      .expectOne(`${environment.apiUrl}/api/projects`)
      .flush([
        { projectCode: 'p1', name: 'Warehouse', key: 'WAR' },
        { projectCode: 'p2', name: 'Orders', key: 'ORD' },
      ]);
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();
  }

  it('shows the current project on the trigger once loaded', async () => {
    await loadProjects();
    expect(trigger().textContent).toContain('Warehouse');
  });

  it('opens a menu of every project, marking the current one', async () => {
    await loadProjects();
    trigger().click();
    fixture.detectChanges();

    const options = menu()!.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[1].getAttribute('aria-selected')).toBe('false');
  });

  it('choosing a project closes the menu and switches the current one', async () => {
    await loadProjects();
    trigger().click();
    fixture.detectChanges();

    const options = menu()!.querySelectorAll('[role="option"]');
    (options[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(menu()).toBeNull();
    expect(trigger().textContent).toContain('Orders');
  });

  it('can be driven from the keyboard', async () => {
    await loadProjects();
    trigger().focus();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(menu()).toBeNull();
    expect(trigger().textContent).toContain('Orders');
  });

  it('says when there are no projects yet', async () => {
    http.expectOne(`${environment.apiUrl}/api/projects`).flush([]);
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Sin proyectos');
    trigger().click();
    fixture.detectChanges();
    expect(menu()?.textContent).toContain('Todavía no tienes proyectos.');
  });

  it('passes axe, closed and open', async () => {
    await loadProjects();
    await expectNoAxeViolations(root());

    trigger().click();
    fixture.detectChanges();
    await expectNoAxeViolations(overlayContainerElement);
  });
});
