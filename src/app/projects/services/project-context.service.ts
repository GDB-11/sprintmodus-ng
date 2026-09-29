import { DOCUMENT } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { Service, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { valueOf } from '../../shared/resource-value';
import { Project } from '../models/project.models';
import { ProjectService } from './project.service';

/**
 * The project the shell (and, as each screen migrates, the screen itself) is showing: one signal instead of a
 * "Proyecto" select repeated per page. Read from `?project=` on load, remembered per user afterwards, and reflected
 * back into `?project=` on every explicit choice so a reload or a shared link keeps it.
 */
@Service()
export class ProjectContextService {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);

  readonly projects = rxResource({ stream: () => this.projectService.list() });

  private readonly queryProjectCode = signal(this.projectCodeInUrl());

  /** Wins over the URL and the remembered choice until the page reloads: the user just picked this one. */
  private readonly manualSelection = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.projectCodeInUrl()),
        startWith(this.projectCodeInUrl()),
      )
      .subscribe((code) => this.queryProjectCode.set(code));
  }

  readonly hasProjects = computed(() => (valueOf(this.projects) ?? []).length > 0);

  readonly current = computed<Project | null>(() => {
    const list = valueOf(this.projects) ?? [];
    if (list.length === 0) {
      return null;
    }
    const requested = this.manualSelection() ?? this.queryProjectCode() ?? this.restore();
    return list.find((project) => project.projectCode === requested) ?? list[0];
  });

  /** Picks a project: remembers it for next time and reflects it into the URL. */
  select(projectCode: string): void {
    this.manualSelection.set(projectCode);
    this.persist(projectCode);
    const urlTree = this.router.parseUrl(this.router.url);
    urlTree.queryParams = { ...urlTree.queryParams, project: projectCode };
    void this.router.navigateByUrl(urlTree);
  }

  private projectCodeInUrl(): string | null {
    return this.router.parseUrl(this.router.url).queryParams['project'] ?? null;
  }

  private storageKey(): string {
    return `sprintmodus.lastProject.${this.auth.currentUser()?.user.id ?? 'anon'}`;
  }

  private persist(projectCode: string): void {
    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey(), projectCode);
    } catch {
      // storage unavailable: the choice just doesn't persist
    }
  }

  private restore(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(this.storageKey()) ?? null;
    } catch {
      return null;
    }
  }
}
