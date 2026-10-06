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
  const button = () => root().querySelector('button')!;

  it('says the current theme and the next one, "sistema" by default', () => {
    expect(button().getAttribute('aria-label')).toBe('Tema: sistema. Cambiar a claro');
  });

  it('cycles claro, oscuro, sistema and applies each', () => {
    const theme = TestBed.inject(ThemeService);
    button().click();
    fixture.detectChanges();
    TestBed.tick();
    expect(theme.theme()).toBe('claro');

    button().click();
    fixture.detectChanges();
    TestBed.tick();
    expect(theme.theme()).toBe('oscuro');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
