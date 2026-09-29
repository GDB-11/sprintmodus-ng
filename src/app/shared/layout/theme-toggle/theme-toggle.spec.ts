import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../../auth/utils/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ThemeService } from '../../theme/theme.service';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  let fixture: ComponentFixture<ThemeToggle>;

  beforeEach(async () => {
    stubLocalStorage();
    await TestBed.configureTestingModule({ imports: [ThemeToggle] }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
  });

  afterEach(() => document.documentElement.classList.remove('dark'));

  const root = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(root().querySelectorAll('button'));

  it('shows the three theme options, "sistema" pressed by default', () => {
    const labels = buttons().map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Claro', 'Oscuro', 'Sistema']);
    expect(buttons().find((b) => b.textContent?.trim() === 'Sistema')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('choosing a theme applies it', () => {
    buttons().find((b) => b.textContent?.trim() === 'Oscuro')!.click();
    fixture.detectChanges();
    TestBed.tick();

    expect(TestBed.inject(ThemeService).theme()).toBe('oscuro');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
