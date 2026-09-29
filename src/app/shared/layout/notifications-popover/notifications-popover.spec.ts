import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { InboxService } from '../../../notifications/services/inbox.service';
import { inboxNotification } from '../../../notifications/testing';
import { expectNoAxeViolations } from '../../../testing/axe';
import { NotificationsPopover } from './notifications-popover';

@Component({ template: '' })
class Dummy {}

describe('NotificationsPopover', () => {
  let fixture: ComponentFixture<NotificationsPopover>;
  let http: HttpTestingController;
  let router: Router;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsPopover],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'notifications', component: Dummy },
          { path: 'work-items/:code', component: Dummy },
        ]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(NotificationsPopover);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
    vi.unstubAllGlobals();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const trigger = () => root().querySelector('button')!;
  const menu = () => overlayContainerElement.querySelector('[role="dialog"]');

  function open(): void {
    trigger().click();
    fixture.detectChanges();
  }

  async function flushList(items: ReturnType<typeof inboxNotification>[] = [inboxNotification()]): Promise<void> {
    TestBed.tick();
    http.expectOne((r) => r.url === `${environment.apiUrl}/api/notifications`).flush({ items, total: items.length, page: 0, size: 5 });
    await Promise.resolve();
    TestBed.tick();
    fixture.detectChanges();
  }

  it('says how many are unread in its accessible name, badge decorative', () => {
    expect(trigger().getAttribute('aria-label')).toBe('Notificaciones');

    TestBed.inject(InboxService).unreadCount.set(2);
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-label')).toBe('Notificaciones, 2 sin leer');
    expect(root().querySelector('app-badge span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens with the latest notifications', async () => {
    open();
    await flushList([inboxNotification({ notificationCode: 'n-1', isRead: false })]);

    expect(menu()?.textContent).toContain('Olivia Owner');
    expect(menu()?.textContent).toContain('Sin leer');
  });

  it('says when there is nothing', async () => {
    open();
    await flushList([]);

    expect(menu()?.textContent).toContain('No tienes notificaciones.');
  });

  it('selecting a notification marks it read and navigates to its work item', async () => {
    open();
    await flushList([inboxNotification({ notificationCode: 'n-1', isRead: false, workItem: { workItemCode: 'wi-1', displayKey: 'WAR-1', title: 'X' } })]);

    Array.from(menu()!.querySelectorAll('li button'))[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    http.expectOne(`${environment.apiUrl}/api/notifications/n-1/read`).flush(null);
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('"Marcar todas como leídas" clears the count and reloads the list', async () => {
    TestBed.inject(InboxService).unreadCount.set(1);
    open();
    await flushList([inboxNotification({ isRead: false })]);

    Array.from(menu()!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Marcar todas'))!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    http.expectOne(`${environment.apiUrl}/api/notifications/read-all`).flush(null);
    expect(TestBed.inject(InboxService).unreadCount()).toBe(0);

    await Promise.resolve();
    TestBed.tick();
    http.expectOne((r) => r.url === `${environment.apiUrl}/api/notifications`).flush({ items: [], total: 0, page: 0, size: 5 });
  });

  it('"Ver todas" closes the popover and goes to /notifications', async () => {
    open();
    await flushList([]);

    Array.from(menu()!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Ver todas'))!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(menu()).toBeNull();
    await vi.waitFor(() => expect(router.url).toBe('/notifications'));
  });

  it('goes straight to /notifications on phone instead of opening a popover', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));

    trigger().click();
    fixture.detectChanges();

    expect(menu()).toBeNull();
    await vi.waitFor(() => expect(router.url).toBe('/notifications'));
  });

  it('passes axe, closed and open', async () => {
    await expectNoAxeViolations(root());

    open();
    await flushList([]);
    await expectNoAxeViolations(overlayContainerElement);
  });
});
