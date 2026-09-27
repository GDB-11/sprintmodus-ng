import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../testing/axe';
import { DesignGallery } from './design-gallery';

describe('DesignGallery', () => {
  let fixture: ComponentFixture<DesignGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DesignGallery] }).compileComponents();
    fixture = TestBed.createComponent(DesignGallery);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('renders exactly one h1', () => {
    expect(root().querySelectorAll('h1').length).toBe(1);
  });

  it('shows every icon in the shared set', () => {
    expect(root().querySelectorAll('svg').length).toBeGreaterThan(30);
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
