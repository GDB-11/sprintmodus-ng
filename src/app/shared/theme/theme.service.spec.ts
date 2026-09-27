import { TestBed } from '@angular/core/testing';
import { stubLocalStorage } from '../../auth/utils/testing';
import { ThemeService } from './theme.service';

function setup() {
  TestBed.configureTestingModule({});
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  beforeEach(() => {
    stubLocalStorage();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('defaults to "sistema" when nothing is stored', () => {
    const service = setup();
    expect(service.theme()).toBe('sistema');
  });

  it('restores a previously chosen theme from storage', () => {
    localStorage.setItem('sprintmodus.theme', 'oscuro');
    const service = setup();
    expect(service.theme()).toBe('oscuro');
  });

  it('ignores an unrecognised stored value', () => {
    localStorage.setItem('sprintmodus.theme', 'purple');
    const service = setup();
    expect(service.theme()).toBe('sistema');
  });

  it('applies the dark class for "oscuro" and removes it for "claro"', () => {
    const service = setup();
    service.setTheme('oscuro');
    TestBed.tick();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    service.setTheme('claro');
    TestBed.tick();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the chosen theme', () => {
    const service = setup();
    service.setTheme('oscuro');
    expect(localStorage.getItem('sprintmodus.theme')).toBe('oscuro');
  });

  it('does not throw when matchMedia is unavailable (jsdom) and "sistema" is selected', () => {
    const service = setup();
    expect(() => {
      service.setTheme('sistema');
      TestBed.tick();
    }).not.toThrow();
  });
});
