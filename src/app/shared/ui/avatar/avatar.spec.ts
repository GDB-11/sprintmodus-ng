import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Avatar } from './avatar';

describe('Avatar', () => {
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Avatar] }).compileComponents();
    fixture = TestBed.createComponent(Avatar);
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows initials from a two-word name', () => {
    fixture.componentRef.setInput('name', 'Ana García');
    fixture.detectChanges();
    expect(root().textContent?.trim()).toBe('AG');
  });

  it('shows one initial from a single-word name', () => {
    fixture.componentRef.setInput('name', 'Ana');
    fixture.detectChanges();
    expect(root().textContent?.trim()).toBe('A');
  });

  it('is labelled with the full name', () => {
    fixture.componentRef.setInput('name', 'Ana García Ruiz');
    fixture.detectChanges();
    expect(root().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Ana García Ruiz');
  });

  it('passes axe', async () => {
    fixture.componentRef.setInput('name', 'Ana García');
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
