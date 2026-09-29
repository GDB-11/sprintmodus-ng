import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Every `data.breadcrumb` string found walking down the currently activated route tree, root to leaf. */
function crumbsOf(snapshot: ActivatedRouteSnapshot): string[] {
  const crumbs: string[] = [];
  let node: ActivatedRouteSnapshot | null = snapshot;
  while (node) {
    const crumb = node.data['breadcrumb'];
    if (typeof crumb === 'string') {
      crumbs.push(crumb);
    }
    node = node.firstChild;
  }
  return crumbs;
}

/**
 * The current section, from the `data.breadcrumb` of the routes it took to get here (see `app.routes.ts`). Hidden below
 * `lg`, where the top bar has no room for it.
 */
@Component({
  selector: 'app-shell-breadcrumb',
  templateUrl: './shell-breadcrumb.html',
})
export class ShellBreadcrumb {
  private readonly router = inject(Router);

  protected readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => crumbsOf(this.router.routerState.snapshot.root)),
    ),
    { initialValue: crumbsOf(this.router.routerState.snapshot.root) },
  );
}
