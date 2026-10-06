import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../testing/axe';
import { NavItem } from '../nav-items';
import { SidebarNavItem } from './sidebar-nav-item';

const ITEM: NavItem = { label: 'Notificaciones', tone: 'warning', icon: 'bell', route: '/notifications', badge: 'notifications' };
const ADMIN_ITEM: NavItem = { label: 'Configuración de flujo', tone: 'neutral', icon: 'settings', route: '/work-items/admin/workflows', adminOnly: true };
const ADMIN_REASON = 'Requiere rol propietario o administrador.';

describe('SidebarNavItem', () => {
  let fixture: ComponentFixture<SidebarNavItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNavItem],
      providers: [provideRouter([{ path: 'notifications', children: [] }])],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarNavItem);
    fixture.componentRef.setInput('item', ITEM);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('is a link to the route, labelled with the item', () => {
    const link = root().querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/notifications');
    expect(link.textContent).toContain('Notificaciones');
  });

  it('shows the label as text from `lg` up when expanded, and only to screen readers when railed', () => {
    expect(root().querySelector('a span:nth-of-type(2)')?.className).toContain('lg:opacity-100');

    fixture.componentRef.setInput('expanded', false);
    fixture.detectChanges();

    expect(root().querySelector('a span:nth-of-type(2)')?.className).not.toContain('lg:opacity-100');
  });

  it('shows a badge and says the count in words, never colour/shape alone', () => {
    expect(root().querySelector('app-badge')).toBeNull();

    fixture.componentRef.setInput('badgeCount', 3);
    fixture.detectChanges();

    expect(root().querySelector('app-badge')).not.toBeNull();
    expect(root().querySelector('a')?.getAttribute('aria-label')).toBe('Notificaciones, 3 sin leer');
  });

  it('renders disabled with the visible reason, not hidden, when one is given', () => {
    fixture.componentRef.setInput('item', ADMIN_ITEM);
    fixture.componentRef.setInput('disabledReason', ADMIN_REASON);
    fixture.detectChanges();

    expect(root().querySelector('a')).toBeNull();
    expect(root().querySelector('div[title]')?.getAttribute('title')).toBe(ADMIN_REASON);
    expect(root().textContent).toContain('Configuración de flujo');
    expect(root().textContent).toContain(ADMIN_REASON);
  });

  it('passes axe, enabled and disabled, expanded and railed', async () => {
    await expectNoAxeViolations(root());

    fixture.componentRef.setInput('expanded', false);
    fixture.detectChanges();
    await expectNoAxeViolations(root());

    fixture.componentRef.setInput('item', ADMIN_ITEM);
    fixture.componentRef.setInput('disabledReason', ADMIN_REASON);
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
    await expectNoAxeViolations(root());
  });
});
