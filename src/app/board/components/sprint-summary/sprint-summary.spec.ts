import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Burndown } from '../../../projects/models/project.models';
import { sprint } from '../../../projects/projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { SprintSummary } from './sprint-summary';

const burndown = (remaining: number): Burndown => ({
  sprintCode: 's1',
  sprintName: 'Sprint 1',
  status: 'ACTIVE',
  startDate: '2026-01-15',
  endDate: '2026-01-19',
  days: 4,
  baselineHours: 40,
  points: [
    { day: 0, date: '2026-01-14', idealRemainingHours: 40, remainingHours: 40 },
    { day: 1, date: '2026-01-15', idealRemainingHours: 30, remainingHours: remaining },
    { day: 2, date: '2026-01-16', idealRemainingHours: 20, remainingHours: null },
    { day: 3, date: '2026-01-17', idealRemainingHours: 10, remainingHours: null },
    { day: 4, date: '2026-01-18', idealRemainingHours: 0, remainingHours: null },
  ],
});

describe('SprintSummary', () => {
  let fixture: ComponentFixture<SprintSummary>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SprintSummary],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;

  async function open(status: 'ACTIVE' | 'PLANNED', remaining?: number): Promise<void> {
    fixture = TestBed.createComponent(SprintSummary);
    fixture.componentRef.setInput('sprint', sprint({ sprintCode: 's1', name: 'Sprint 1', status, startDate: '2026-01-15', endDate: '2026-01-19' }));
    fixture.detectChanges();
    if (remaining !== undefined) {
      http.expectOne(`${environment.apiUrl}/api/sprints/s1/burndown`).flush(burndown(remaining));
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('says the pace is behind when the hours left are above the ideal line, and the days left', async () => {
    await open('ACTIVE', 35);

    expect(root().textContent).toContain('Sprint 1 · Activo');
    expect(root().textContent).toContain('3 días restantes');
    expect(root().textContent).toContain('Por detrás del ritmo ideal');
    expect(root().querySelector('svg[role="img"]')).not.toBeNull();
    await expectNoAxeViolations(root());
  });

  it('says the sprint is on track when the hours left are at or under the ideal line', async () => {
    await open('ACTIVE', 28);

    expect(root().textContent).toContain('Al día');
  });

  it('asks for no burndown for a sprint that is not running', async () => {
    await open('PLANNED');

    expect(root().textContent).toContain('Sprint 1 · Planificado');
    expect(root().querySelector('svg')).toBeNull();
  });
});
