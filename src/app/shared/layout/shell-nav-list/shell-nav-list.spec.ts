import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFakeAuth } from '../../../auth/auth.testing';
import { AuthService } from '../../../auth/services/auth.service';
import { expectNoAxeViolations } from '../../../testing/axe';
import { InboxService } from '../../../notifications/services/inbox.service';
import { NAV_ITEMS } from '../nav-items';
import { ShellNavList } from './shell-nav-list';

describe('ShellNavList', () => {
  let fixture: ComponentFixture<ShellNavList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellNavList],
      providers: [provideRouter([]), provideFakeAuth()],
    }).compileComponents();
    fixture = TestBed.createComponent(ShellNavList);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('renders every item of NAV_ITEMS as a link for an owner', () => {
    const links = root().querySelectorAll('a');
    expect(links.length).toBe(NAV_ITEMS.length);
  });

  it('shows the admin-only item disabled with its reason for a member', () => {
    (TestBed.inject(AuthService) as unknown as { becomes(role: 'MEMBER'): void }).becomes('MEMBER');
    fixture.detectChanges();

    const disabled = Array.from(root().querySelectorAll('div[title]')).find((el) => el.textContent?.includes('Configuración de flujo'));
    expect(disabled?.getAttribute('title')).toBe('Requiere rol propietario o administrador.');
  });

  it('lets an owner or admin use the admin-only item', () => {
    (TestBed.inject(AuthService) as unknown as { becomes(role: 'OWNER'): void }).becomes('OWNER');
    fixture.detectChanges();

    const link = Array.from(root().querySelectorAll('a')).find((el) => el.textContent?.includes('Configuración de flujo'));
    expect(link).not.toBeUndefined();
  });

  it("shows the unread notification count on the notifications item's badge", () => {
    TestBed.inject(InboxService).unreadCount.set(5);
    fixture.detectChanges();

    const notifications = Array.from(root().querySelectorAll('a')).find((el) => el.textContent?.includes('Notificaciones'));
    expect(notifications?.querySelector('app-badge')).not.toBeNull();
  });

  it('passes axe', async () => {
    await expectNoAxeViolations(root());
  });
});
