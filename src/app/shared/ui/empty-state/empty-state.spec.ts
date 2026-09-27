import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  let fixture: ComponentFixture<EmptyState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyState] }).compileComponents();
    fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'No hay elementos de trabajo todavía.');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows the message', () => {
    expect(root().textContent).toContain('No hay elementos de trabajo todavía.');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
