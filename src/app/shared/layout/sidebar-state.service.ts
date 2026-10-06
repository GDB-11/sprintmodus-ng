import { DOCUMENT } from '@angular/common';
import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

const STORAGE_KEY = 'sprintmodus.sidebar.collapsed';

/**
 * Whether the desktop sidebar shows as a 240px panel with labels or a 64px icon rail (tablet is always a rail; phone
 * uses the drawer instead and does not consult this). The choice is remembered, except on the board: there the rail is
 * the default (more room for the columns) and a toggle during that visit is a session-only override that clears the
 * moment the user leaves the board, so the remembered choice governs everywhere else again.
 */
@Service()
export class SidebarStateService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  private readonly storedCollapsed = signal(this.restore());
  private readonly sessionOverride = signal<boolean | null>(null);

  private readonly onBoard = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/board')),
    ),
    { initialValue: this.router.url.startsWith('/board') },
  );

  readonly collapsed = computed(() => this.sessionOverride() ?? (this.onBoard() ? true : this.storedCollapsed()));

  constructor() {
    // Leaving the board forgets this visit's override, so the remembered (or default) state applies again elsewhere.
    effect(() => {
      this.onBoard();
      untracked(() => this.sessionOverride.set(null));
    });
  }

  toggle(): void {
    const next = !this.collapsed();
    if (this.onBoard()) {
      this.sessionOverride.set(next);
    } else {
      this.storedCollapsed.set(next);
      this.persist(next);
    }
  }

  private persist(collapsed: boolean): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // storage unavailable: the choice just doesn't persist
    }
  }

  private restore(): boolean {
    try {
      return this.document.defaultView?.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
