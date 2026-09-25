import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { burndown } from '../../../projects/projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { CHART_FACTORY } from '../burndown-chart/burndown-chart';
import { BurndownPage } from './burndown-page';

const URL = `${environment.apiUrl}/api/sprints/s1/burndown`;

describe('BurndownPage', () => {
  let fixture: ComponentFixture<BurndownPage>;
  let http: HttpTestingController;
  const draws: unknown[] = [];

  beforeEach(async () => {
    draws.length = 0;
    await TestBed.configureTestingModule({
      imports: [BurndownPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ code: 's1' })) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CHART_FACTORY, useValue: () => ({ update: (config: unknown) => draws.push(config), destroy: () => undefined }) },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');

  /** The value shown under a label of the facts list. */
  const fact = (label: string) =>
    [...root().querySelectorAll('dt')].find((dt) => dt.textContent!.trim() === label)?.nextElementSibling?.textContent!.replace(/\s+/g, ' ').trim();
  const nextRequest = () => vi.waitFor(() => http.expectOne(URL));

  async function open(): Promise<void> {
    fixture = TestBed.createComponent(BurndownPage);
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('asks for the burndown of the sprint in the URL and shows its facts and its chart', async () => {
    await open();
    expect(text()).toContain('Cargando el burndown');

    http.expectOne(URL).flush(burndown(10, 40, [36, 30]));
    await settle();

    expect(root().querySelector('h1')?.textContent).toBe('Burndown de Sprint 1');
    expect(fact('Estado')).toBe('Activo');
    expect(fact('Fechas')).toBe('Jan 5, 2026 – Jan 15, 2026 (10 días)');
    expect(fact('Horas al empezar')).toBe('40');
    expect(fact('Horas pendientes')).toBe('30 (día 2)');
    expect(root().querySelector('app-burndown-chart canvas')).not.toBeNull();
    expect(draws.length).toBeGreaterThan(0);
  });

  it('says there is no data yet for a sprint that has not started', async () => {
    await open();

    http.expectOne(URL).flush(burndown(10, 0, [], { status: 'PLANNED' }));
    await settle();

    expect(fact('Estado')).toBe('Planificado');
    expect(fact('Horas pendientes')).toBe('Sin datos todavía');
  });

  it('shows why it failed and can try again', async () => {
    await open();

    http.expectOne(URL).flush({ code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Sprint not found.');

    root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    (await nextRequest()).flush(burndown(10, 40, [36]));
    await settle();
    expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('reloads on demand', async () => {
    await open();
    http.expectOne(URL).flush(burndown(10, 40, [36]));
    await settle();

    [...root().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Actualizar')!.click();

    (await nextRequest()).flush(burndown(10, 40, [36, 30]));
    await settle();
    expect(fact('Horas pendientes')).toBe('30 (día 2)');
  });

  it('is free of accessibility violations', async () => {
    await open();
    http.expectOne(URL).flush(burndown(10, 40, [36, 30]));
    await settle();

    await expectNoAxeViolations(root());
  });
});
