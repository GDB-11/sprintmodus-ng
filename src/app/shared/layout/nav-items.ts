import { IconName } from '../ui/icon/icon';

/** Something the sidebar/drawer/search-palette can point at. Live badges are looked up by `badge`, not stored here. */
export interface NavItem {
  label: string;
  icon: IconName;
  route: string;
  /** Shown disabled with the reason "Requiere rol propietario o administrador" for anyone `Permissions.canAdminister()` refuses. */
  adminOnly?: boolean;
  /** Which live count, if any, decorates this item. */
  badge?: 'notifications';
}

/**
 * The one navigation structure the sidebar, the drawer and the search palette's "ir a…" entries all read (CLAUDE.md,
 * Components: "the chrome exists once"). Order here is the order shown everywhere.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Panel', icon: 'layout-dashboard', route: '/dashboard' },
  { label: 'Elementos de trabajo', icon: 'list-tree', route: '/work-items' },
  { label: 'Tablero', icon: 'kanban', route: '/board' },
  { label: 'Sprints', icon: 'timer', route: '/sprints' },
  { label: 'Notificaciones', icon: 'bell', route: '/notifications', badge: 'notifications' },
  { label: 'Configuración de flujo', icon: 'settings', route: '/work-items/admin/workflows', adminOnly: true },
];

export const ADMIN_ONLY_REASON = 'Requiere rol propietario o administrador.';
