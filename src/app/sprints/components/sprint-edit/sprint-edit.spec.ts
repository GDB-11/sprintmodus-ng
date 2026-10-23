import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { Sprint } from '../../../projects/models/project.models';
import { sprint } from '../../../projects/projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SprintEdit } from './sprint-edit';

const URL = `${environment.apiUrl}/api/sprints/s1`;

describe('SprintEdit', () => {
  let fixture: ComponentFixture<SprintEdit>;
  let http: HttpTestingController;
  let saved: Sprint[];

  beforeEach(async () => {
    saved = [];
    await TestBed.configureTestingModule({
      imports: [SprintEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFakeAuth()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => root().querySelector<HTMLInputElement>(`#${id}`)!;

  function open(overrides: Partial<Sprint> = {}): void {
    fixture = TestBed.createComponent(SprintEdit);
    fixture.componentRef.setInput('sprint', sprint(overrides));
    fixture.componentInstance.saved.subscribe((value) => saved.push(value));
    fixture.detectChanges();
  }

  function type(id: string, value: string): void {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  }

  const submit = () => root().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

  it('starts from the sprint and, with a start date free to change, saves the points and the new dates', async () => {
    open();
    expect(input('sprint-edit-name').value).toBe('Sprint 1');
    expect(input('sprint-edit-end').value).toBe('2026-01-19');
    expect(input('sprint-edit-planned').value).toBe('0');
    expect(input('sprint-edit-start').disabled).toBe(false);

    type('sprint-edit-start', '2026-01-06');
    type('sprint-edit-end', '2026-01-22');
    type('sprint-edit-planned', '34');
    submit();

    const request = await vi.waitFor(() => http.expectOne(URL));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Sprint 1', startDate: '2026-01-06', endDate: '2026-01-22', plannedVelocity: 34 });
    const updated = sprint({ startDate: '2026-01-06', endDate: '2026-01-22', plannedVelocity: 34 });
    request.flush(updated);
    await fixture.whenStable();

    expect(saved).toEqual([updated]);
  });

  it('keeps the start date of a running sprint fixed but lets the end date and the points change', async () => {
    open({ status: 'ACTIVE' });
    expect(input('sprint-edit-start').disabled).toBe(true);
    expect(input('sprint-edit-end').disabled).toBe(false);

    type('sprint-edit-end', '2026-01-26');
    submit();

    const request = await vi.waitFor(() => http.expectOne(URL));
    expect(request.request.body).toEqual({ name: 'Sprint 1', endDate: '2026-01-26', plannedVelocity: 0 });
    request.flush(sprint({ status: 'ACTIVE', endDate: '2026-01-26' }));
  });

  it('does not send an end date that is not after the start, and shows why', async () => {
    open();
    type('sprint-edit-end', '2026-01-05');
    submit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(URL);
    expect(root().textContent).toContain('Debe terminar después del inicio');
  });

  it('shows what the server says when the dates overlap another sprint', async () => {
    open();
    submit();

    const request = await vi.waitFor(() => http.expectOne(URL));
    request.flush(
      { code: 'SPRINT_OVERLAP', message: 'These dates overlap another sprint of the project.' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().textContent).toContain('overlap another sprint');
    expect(saved).toEqual([]);
  });

  it('has no accessibility violations', async () => {
    open();
    await expectNoAxeViolations(root());
  });
});
