import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../testing/axe';
import { InboxService } from '../../services/inbox.service';
import { NotificationsBell } from './notifications-bell';

describe('NotificationsBell', () => {
  let fixture: ComponentFixture<NotificationsBell>;
  let inbox: InboxService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsBell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    inbox = TestBed.inject(InboxService);
    fixture = TestBed.createComponent(NotificationsBell);
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const link = () => root().querySelector('a')!;
  const badge = () => root().querySelector('span[aria-hidden="true"]');

  function unread(count: number | null): void {
    inbox.unreadCount.set(count);
    fixture.detectChanges();
  }

  it('is a link to the notifications', () => {
    expect(link().getAttribute('href')).toBe('/notifications');
    expect(link().textContent).toContain('Notificaciones');
  });

  it('shows no badge and a plain name when there is nothing unread, or nothing is known yet', () => {
    expect(badge()).toBeNull();
    expect(link().getAttribute('aria-label')).toBe('Notificaciones');

    unread(0);
    expect(badge()).toBeNull();
  });

  it('shows how many are unread, in its name too, so it is not only a badge', () => {
    unread(3);

    expect(badge()?.textContent).toBe('3');
    expect(link().getAttribute('aria-label')).toBe('Notificaciones, 3 sin leer');
  });

  it('caps the badge at 99+ but says the real number in its name', () => {
    unread(150);

    expect(badge()?.textContent).toBe('99+');
    expect(link().getAttribute('aria-label')).toBe('Notificaciones, 150 sin leer');
  });

  it('says in a status region when new notifications arrive', () => {
    inbox.announcement.set('Tienes 2 notificaciones sin leer.');
    fixture.detectChanges();

    expect(root().querySelector('[role="status"]')?.textContent).toBe('Tienes 2 notificaciones sin leer.');
  });

  it('asks for nothing itself: the count is the inbox service\'s, polled once for the whole app', () => {
    unread(1);

    expect(inbox.unreadCount()).toBe(1);
  });

  it('passes axe with and without a badge', async () => {
    await expectNoAxeViolations(root());
    unread(12);
    await expectNoAxeViolations(root());
  });
});
