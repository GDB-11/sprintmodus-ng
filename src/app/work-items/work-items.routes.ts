import { Routes } from '@angular/router';
import { adminGuard } from '../auth/guards/auth.guard';

export const WORK_ITEM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/work-item-list/work-item-list').then((m) => m.WorkItemList),
  },
  {
    path: 'new',
    loadComponent: () => import('./components/work-item-create/work-item-create').then((m) => m.WorkItemCreate),
  },
  {
    path: 'admin/workflows',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./components/workflow-admin/workflow-admin').then((m) => m.WorkflowAdmin),
  },
  {
    path: ':code',
    loadComponent: () => import('./components/work-item-detail/work-item-detail').then((m) => m.WorkItemDetail),
  },
];
