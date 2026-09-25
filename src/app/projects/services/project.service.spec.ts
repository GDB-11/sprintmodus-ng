import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProjectService } from './project.service';

const API = `${environment.apiUrl}/api`;

describe('ProjectService', () => {
  let service: ProjectService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists projects and the sprints of one', () => {
    service.list().subscribe();
    http.expectOne(`${API}/projects`).flush([]);

    service.sprints('p1').subscribe();
    http.expectOne(`${API}/sprints?projectCode=p1`).flush([]);
  });

  it('creates a sprint with POST', () => {
    service.createSprint({ projectCode: 'p1', name: 'Sprint 1', startDate: '2026-01-05' }).subscribe();

    const request = http.expectOne(`${API}/sprints`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ projectCode: 'p1', name: 'Sprint 1', startDate: '2026-01-05' });
    request.flush({});
  });

  it('starts and closes a sprint with an empty POST', () => {
    service.startSprint('s1').subscribe();
    const start = http.expectOne(`${API}/sprints/s1/start`);
    expect(start.request.method).toBe('POST');
    start.flush({});

    service.closeSprint('s1').subscribe();
    const close = http.expectOne(`${API}/sprints/s1/close`);
    expect(close.request.method).toBe('POST');
    close.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('reads and replaces the sprint configuration', () => {
    service.sprintConfig().subscribe();
    http.expectOne(`${API}/sprints/config`).flush({});

    const config = { defaultSprintDays: 7, sprintStartDay: 'WEDNESDAY' as const, velocityTrackingEnabled: false };
    service.updateSprintConfig(config).subscribe();
    const update = http.expectOne(`${API}/sprints/config`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual(config);
    update.flush(config);
  });

  it('reads the burndown of a sprint and the velocity history of a project, with or without a limit', () => {
    service.burndown('s1').subscribe();
    http.expectOne(`${API}/sprints/s1/burndown`).flush({});

    service.velocityHistory('p1', 6).subscribe();
    const limited = http.expectOne((req) => req.url === `${API}/sprints/velocity-history`);
    expect(limited.request.params.get('projectCode')).toBe('p1');
    expect(limited.request.params.get('limit')).toBe('6');
    limited.flush({});

    service.velocityHistory('p1').subscribe();
    const all = http.expectOne((req) => req.url === `${API}/sprints/velocity-history`);
    expect(all.request.params.has('limit')).toBe(false);
    all.flush({});
  });
});
