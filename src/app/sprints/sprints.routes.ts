import { Routes } from '@angular/router';

export const SPRINT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/sprint-management/sprint-management').then((m) => m.SprintManagement),
  },
  {
    path: ':code/burndown',
    loadComponent: () => import('./components/burndown-page/burndown-page').then((m) => m.BurndownPage),
  },
];
