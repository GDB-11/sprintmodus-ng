import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  let fixture: ComponentFixture<Skeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Skeleton] }).compileComponents();
    fixture = TestBed.createComponent(Skeleton);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const span = () => root().querySelector('span')!;

  it('is decorative', () => {
    expect(span().getAttribute('aria-hidden')).toBe('true');
  });

  it('sizes itself from width/height inputs', () => {
    fixture.componentRef.setInput('width', '12rem');
    fixture.componentRef.setInput('height', '2rem');
    fixture.detectChanges();

    expect(span().style.width).toBe('12rem');
    expect(span().style.height).toBe('2rem');
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
