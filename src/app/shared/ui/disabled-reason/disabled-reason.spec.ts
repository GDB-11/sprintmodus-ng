import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { DisabledReason } from './disabled-reason';

describe('DisabledReason', () => {
  let fixture: ComponentFixture<DisabledReason>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DisabledReason] }).compileComponents();
    fixture = TestBed.createComponent(DisabledReason);
    fixture.componentRef.setInput('reason', 'Requiere rol propietario o administrador.');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows the reason as visible text (works on touch, unlike a title tooltip)', () => {
    expect(root().textContent?.trim()).toBe('Requiere rol propietario o administrador.');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
