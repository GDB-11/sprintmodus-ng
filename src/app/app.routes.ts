import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/guards/auth.guard';
import { environment } from '../environments/environment';

export const routes: Routes = [
  // dev-only component gallery: never registered in a production build
  ...(environment.production
    ? []
    : [
        {
          path: 'design',
          loadComponent: () => import('./design/design-gallery/design-gallery').then((m) => m.DesignGallery),
        },
      ]),
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/pages/register-organization/register-organization').then(
        (m) => m.RegisterOrganization,
      ),
  },
  {
    // Every authenticated screen renders inside the shell (top bar + sidebar), Phase 16. Same URLs as before: nesting
    // under an empty path segment doesn't change them.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'dashboard',
        data: { breadcrumb: 'Panel' },
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'work-items',
        data: { breadcrumb: 'Elementos de trabajo' },
        loadChildren: () => import('./work-items/work-items.routes').then((m) => m.WORK_ITEM_ROUTES),
      },
      {
        path: 'board',
        data: { breadcrumb: 'Tablero' },
        loadComponent: () =>
          import('./board/components/kanban-board/kanban-board').then((m) => m.KanbanBoard),
      },
      {
        path: 'sprints',
        data: { breadcrumb: 'Sprints' },
        loadChildren: () => import('./sprints/sprints.routes').then((m) => m.SPRINT_ROUTES),
      },
      {
        path: 'notifications',
        data: { breadcrumb: 'Notificaciones' },
        loadComponent: () =>
          import('./notifications/components/notification-list/notification-list').then((m) => m.NotificationList),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
