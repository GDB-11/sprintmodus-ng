import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Icon } from './icon';

describe('Icon', () => {
  let fixture: ComponentFixture<Icon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Icon] }).compileComponents();
    fixture = TestBed.createComponent(Icon);
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const svg = () => root().querySelector('svg')!;

  it('is decorative (aria-hidden, no role) when no label is given', () => {
    fixture.componentRef.setInput('name', 'search');
    fixture.detectChanges();

    expect(svg().getAttribute('aria-hidden')).toBe('true');
    expect(svg().getAttribute('role')).toBeNull();
  });

  it('becomes a labelled image when a label is given', () => {
    fixture.componentRef.setInput('name', 'bell');
    fixture.componentRef.setInput('label', 'Notificaciones');
    fixture.detectChanges();

    expect(svg().getAttribute('aria-hidden')).toBeNull();
    expect(svg().getAttribute('role')).toBe('img');
    expect(svg().getAttribute('aria-label')).toBe('Notificaciones');
  });

  it('renders every shape kind used by the icon set without error', () => {
    for (const name of ['search', 'lock', 'chevron-down', 'layout-dashboard', 'filter'] as const) {
      fixture.componentRef.setInput('name', name);
      fixture.detectChanges();
      expect(svg().children.length).toBeGreaterThan(0);
    }
  });

  it('passes axe both decorative and labelled', async () => {
    fixture.componentRef.setInput('name', 'search');
    fixture.detectChanges();
    await expectNoAxeViolations(root());

    fixture.componentRef.setInput('label', 'Buscar');
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
