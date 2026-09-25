import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sprint } from '../../../projects/models/project.models';
import { sprint as aSprint } from '../../../projects/projects.testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ALL_SPRINTS, BACKLOG, SprintFilter } from './sprint-filter';

const sprint = (n: number, status: Sprint['status']): Sprint =>
  aSprint({
    sprintCode: `s${n}`,
    name: `Sprint ${n}`,
    status,
    startDate: `2026-0${n}-01`,
    endDate: `2026-0${n}-14`,
  });

const SPRINTS: Sprint[] = [
  sprint(1, 'CLOSED'),
  sprint(2, 'CLOSED'),
  sprint(3, 'CLOSED'),
  sprint(4, 'ACTIVE'),
  sprint(5, 'PLANNED'),
  sprint(6, 'PLANNED'),
  sprint(7, 'PLANNED'),
];

describe('SprintFilter', () => {
  let fixture: ComponentFixture<SprintFilter>;

  function render(sprints: Sprint[] = SPRINTS, selected = ALL_SPRINTS): void {
    fixture = TestBed.createComponent(SprintFilter);
    fixture.componentRef.setInput('sprints', sprints);
    fixture.componentRef.setInput('selected', selected);
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => [...root().querySelectorAll('button')];
  const label = (button: Element) => button.textContent!.replace(/\s+/g, ' ').trim();

  it('puts the recently ended, the current and the upcoming sprints one click away, in timeline order', () => {
    render();

    expect(buttons().map((button) => label(button).replace(/, del .*$/, '').trim())).toEqual([
      'Sprint 2 · Cerrado',
      'Sprint 3 · Cerrado',
      'Sprint 4 · Activo',
      'Sprint 5 · Planificado',
      'Sprint 6 · Planificado',
      'Backlog (sin sprint)',
      'Todos',
    ]);
    expect(root().textContent).toContain('Terminaron hace poco');
    expect(root().textContent).toContain('Sprint actual');
    expect(root().textContent).toContain('Próximos');
  });

  it('keeps the sprints beyond those in a list of their own', () => {
    render();

    const options = [...root().querySelectorAll('#other-sprints option')].map((option) => label(option));
    expect(options).toEqual(['Elegir…', 'Sprint 7 · Planificado', 'Sprint 1 · Cerrado']);
  });

  it('has no list of others when every sprint has a button', () => {
    render([sprint(1, 'ACTIVE')]);

    expect(root().querySelector('#other-sprints')).toBeNull();
    expect(root().textContent).not.toContain('Terminaron hace poco');
  });

  it('says which one is selected with aria-pressed', () => {
    render(SPRINTS, 's4');

    const pressed = buttons().filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => label(button))).toEqual([expect.stringContaining('Sprint 4')]);
  });

  it('selects a sprint, the backlog, everything, or one from the list', () => {
    render();
    const selections: string[] = [];
    fixture.componentInstance.selected.subscribe((value) => selections.push(value));

    buttons().find((button) => label(button).startsWith('Sprint 3'))!.click();
    buttons().find((button) => label(button).startsWith('Backlog'))!.click();
    buttons().find((button) => label(button) === 'Todos')!.click();
    const list = root().querySelector<HTMLSelectElement>('#other-sprints')!;
    list.value = 's7';
    list.dispatchEvent(new Event('change'));

    expect(selections).toEqual(['s3', BACKLOG, ALL_SPRINTS, 's7']);
  });

  it('is free of accessibility violations', async () => {
    render(SPRINTS, 's4');

    await expectNoAxeViolations(root());
  });
});
