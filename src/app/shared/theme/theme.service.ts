import { DOCUMENT } from '@angular/common';
import { effect, inject, Service, signal } from '@angular/core';

export type Theme = 'claro' | 'oscuro' | 'sistema';

const STORAGE_KEY = 'sprintmodus.theme';

/**
 * Applies and persists claro/oscuro/sistema by toggling the `dark` class on `<html>`. A tiny inline script in
 * `index.html` sets that class before first paint (from the same storage key) so there is no flash; this service
 * takes over reactively once Angular bootstraps, including following `prefers-color-scheme` live while in "sistema".
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  readonly theme = signal<Theme>(this.restore());

  constructor() {
    effect(() => this.apply(this.theme()));
    this.media?.addEventListener('change', () => {
      if (this.theme() === 'sistema') {
        this.apply('sistema');
      }
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // storage unavailable (private mode, disabled cookies): the choice just doesn't persist
    }
  }

  private restore(): Theme {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      if (stored === 'claro' || stored === 'oscuro' || stored === 'sistema') {
        return stored;
      }
    } catch {
      // storage unavailable: fall through to the default
    }
    return 'sistema';
  }

  private apply(theme: Theme): void {
    const dark = theme === 'oscuro' || (theme === 'sistema' && (this.media?.matches ?? false));
    this.document.documentElement.classList.toggle('dark', dark);
  }
}
