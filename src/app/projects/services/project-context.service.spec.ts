import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { provideFakeAuth } from '../../auth/auth.testing';
import { stubLocalStorage } from '../../auth/utils/testing';
import { environment } from '../../../environments/environment';
import { ProjectContextService } from './project-context.service';

@Component({ template: '' })
class Dummy {}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', component: Dummy }]), provideFakeAuth()],
  });
  return {
    service: TestBed.inject(ProjectContextService),
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

async function flushProjects(http: HttpTestingController, projects: { projectCode: string; name: string; key: string }[]) {
  TestBed.tick();
  http.expectOne(`${environment.apiUrl}/api/projects`).flush(projects);
  await Promise.resolve();
  TestBed.tick();
}

const WAR = { projectCode: 'p-war', name: 'Warehouse', key: 'WAR' };
const ORD = { projectCode: 'p-ord', name: 'Orders', key: 'ORD' };

describe('ProjectContextService', () => {
  beforeEach(() => stubLocalStorage());

  it('is null while there are no projects', async () => {
    const { service, http } = setup();
    await flushProjects(http, []);

    expect(service.current()).toBeNull();
    expect(service.hasProjects()).toBe(false);
  });

  it('defaults to the first project when nothing was chosen', async () => {
    const { service, http } = setup();
    await flushProjects(http, [WAR, ORD]);

    expect(service.current()?.projectCode).toBe('p-war');
    expect(service.hasProjects()).toBe(true);
  });

  it('reads the initial project from ?project= in the URL', async () => {
    const { service, http, router } = setup();
    await router.navigateByUrl('/work-items?project=p-ord');
    await flushProjects(http, [WAR, ORD]);

    expect(service.current()?.projectCode).toBe('p-ord');
  });

  it('falls back to the first project when the URL names one that does not exist', async () => {
    const { service, http, router } = setup();
    await router.navigateByUrl('/work-items?project=unknown');
    await flushProjects(http, [WAR, ORD]);

    expect(service.current()?.projectCode).toBe('p-war');
  });

  it('restores a previously chosen project for the signed-in user when the URL names none', async () => {
    localStorage.setItem('sprintmodus.lastProject.u-me', 'p-ord');
    const { service, http } = setup();
    await flushProjects(http, [WAR, ORD]);

    expect(service.current()?.projectCode).toBe('p-ord');
  });

  it('select() switches the current project, persists it and reflects it into the URL', async () => {
    const { service, http, router } = setup();
    await router.navigateByUrl('/work-items');
    await flushProjects(http, [WAR, ORD]);

    const navigated = firstValueFrom(router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)));
    service.select('p-ord');
    await navigated;
    TestBed.tick();

    expect(service.current()?.projectCode).toBe('p-ord');
    expect(localStorage.getItem('sprintmodus.lastProject.u-me')).toBe('p-ord');
    expect(router.url).toContain('project=p-ord');
  });
});
