import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Logo } from './logo';

describe('Logo', () => {
  let fixture: ComponentFixture<Logo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Logo] }).compileComponents();
    fixture = TestBed.createComponent(Logo);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('shows the wordmark by default', () => {
    expect(root().textContent?.trim()).toBe('Sprintmodus');
  });

  it('hides the wordmark when markOnly is set', () => {
    fixture.componentRef.setInput('markOnly', true);
    fixture.detectChanges();

    expect(root().textContent?.trim()).toBe('');
    expect(root().querySelector('svg')).not.toBeNull();
  });

  it('passes axe with and without the wordmark', async () => {
    await expectNoAxeViolations(root());
    fixture.componentRef.setInput('markOnly', true);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
