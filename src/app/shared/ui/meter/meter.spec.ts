import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Meter } from './meter';

describe('Meter', () => {
  let fixture: ComponentFixture<Meter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Meter] }).compileComponents();
    fixture = TestBed.createComponent(Meter);
    fixture.componentRef.setInput('label', 'Proyectos');
    fixture.componentRef.setInput('value', 4);
    fixture.componentRef.setInput('max', 10);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows the label and the numbers as text, never colour alone', () => {
    expect(root().textContent).toContain('Proyectos');
    expect(root().textContent).toContain('4 / 10');
  });

  it('fills proportionally', () => {
    const fill = root().querySelector('.bg-primary-500') as HTMLElement;
    expect(fill.style.width).toBe('40%');
  });

  it('clamps over-full usage at 100%', () => {
    fixture.componentRef.setInput('value', 15);
    fixture.detectChanges();
    const fill = root().querySelector('.bg-primary-500') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
