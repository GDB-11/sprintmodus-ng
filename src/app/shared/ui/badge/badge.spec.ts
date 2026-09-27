import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Badge } from './badge';

describe('Badge', () => {
  let fixture: ComponentFixture<Badge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Badge] }).compileComponents();
    fixture = TestBed.createComponent(Badge);
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const span = () => root().querySelector('span')!;

  it('shows the count', () => {
    fixture.componentRef.setInput('count', 3);
    fixture.detectChanges();
    expect(span().textContent).toBe('3');
  });

  it('caps at the given cap', () => {
    fixture.componentRef.setInput('count', 150);
    fixture.componentRef.setInput('cap', 99);
    fixture.detectChanges();
    expect(span().textContent).toBe('99+');
  });

  it('is decorative (the consumer supplies the accessible number)', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    expect(span().getAttribute('aria-hidden')).toBe('true');
  });

  it('passes axe', async () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
