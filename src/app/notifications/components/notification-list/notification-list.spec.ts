import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { expectNoAxeViolations } from '../../../testing/axe';
import { InboxNotification } from '../../models/notification.models';
import { inboxNotification } from '../../testing';
import { NotificationList } from './notification-list';

const API = `${environment.apiUrl}/api/notifications`;
const page = (items: InboxNotification[], total = items.length, number = 0) => ({ items, total, page: number, size: 20 });

describe('NotificationList', () => {
  let fixture: ComponentFixture<NotificationList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationList],
      providers: [provideRouter([{ path: 'work-items/:code', children: [] }, { path: 'dashboard', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NotificationList);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.match(`${API}/unread-count`);
    http.verify();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const rows = () => [...root().querySelectorAll('li')];
  const buttonWithText = (text: string) =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text)!;
  const status = () => root().querySelector('p[role="status"].sr-only')!.textContent?.trim();

  async function load(items: InboxNotification[], total = items.length): Promise<void> {
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === API));
    request.flush(page(items, total));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('has the heading and lists the notifications as sentences that link to their work item', async () => {
    await load([inboxNotification(), inboxNotification({ notificationCode: 'n-2', workItem: { workItemCode: 'item-2', displayKey: 'WAR-1001', title: 'Refund' }, isRead: true })]);

    expect(root().querySelector('h1')?.textContent).toBe('Notificaciones');
    expect(rows()).toHaveLength(2);
    const first = rows()[0].querySelector('a')!;
    expect(first.textContent).toBe('Olivia Owner te mencionó en un comentario de WAR-1000 · Pay by card');
    expect(first.getAttribute('href')).toBe('/work-items/item-1');
    expect(rows()[1].querySelector('a')?.getAttribute('href')).toBe('/work-items/item-2');
  });

  it('says which are unread in words, and offers to mark only those', async () => {
    await load([inboxNotification(), inboxNotification({ notificationCode: 'n-2', isRead: true })]);

    expect(rows()[0].textContent).toContain('Sin leer');
    expect(rows()[1].textContent).not.toContain('Sin leer');
    expect(rows()[0].querySelector('button')?.textContent?.trim()).toBe('Marcar como leída');
    expect(rows()[0].querySelector('button')?.getAttribute('aria-label')).toContain('Olivia Owner te mencionó');
    expect(rows()[1].querySelector('button')).toBeNull();
  });

  it('says so when there is nothing', async () => {
    await load([]);

    expect(root().textContent).toContain('Aún no tienes notificaciones.');
    expect(buttonWithText('Marcar todas como leídas').disabled).toBe(true);
  });

  it('marks one as read and says so', async () => {
    await load([inboxNotification(), inboxNotification({ notificationCode: 'n-2' })]);

    rows()[0].querySelector('button')!.click();
    http.expectOne(`${API}/n-1/read`).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(rows()[0].textContent).not.toContain('Sin leer');
    expect(rows()[1].textContent).toContain('Sin leer');
    expect(status()).toBe('Notificación marcada como leída.');
  });

  it('marks all as read, then shows the list again', async () => {
    await load([inboxNotification(), inboxNotification({ notificationCode: 'n-2' })]);

    buttonWithText('Marcar todas como leídas').click();
    http.expectOne(`${API}/read-all`).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    await load([inboxNotification({ isRead: true }), inboxNotification({ notificationCode: 'n-2', isRead: true })]);

    expect(status()).toBe('Todas las notificaciones están marcadas como leídas.');
    expect(root().textContent).not.toContain('Sin leer');
  });

  it('shows the backend\'s message when marking fails, and keeps the row unread', async () => {
    await load([inboxNotification()]);

    rows()[0].querySelector('button')!.click();
    http.expectOne(`${API}/n-1/read`).flush({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' }, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Notification not found.');
    expect(rows()[0].textContent).toContain('Sin leer');
  });

  it('opening one marks it as read while the link takes you to the work item', async () => {
    await load([inboxNotification()]);
    const router = TestBed.inject(Router);

    rows()[0].querySelector('a')!.click();
    http.expectOne(`${API}/n-1/read`).flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(router.url).toBe('/work-items/item-1');
  });

  it('shows only the unread ones when asked, and drops a row once it is read', async () => {
    await load([inboxNotification(), inboxNotification({ notificationCode: 'n-2', isRead: true })]);

    root().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === API));
    expect(request.request.params.get('unread')).toBe('true');
    request.flush(page([inboxNotification()]));
    await settle();
    expect(status()).toBe('Mostrando solo las notificaciones sin leer.');

    rows()[0].querySelector('button')!.click();
    http.expectOne(`${API}/n-1/read`).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(rows()).toHaveLength(0);
    expect(root().textContent).toContain('No tienes notificaciones sin leer.');
  });

  it('shows more, twenty at a time', async () => {
    const first = Array.from({ length: 20 }, (_, i) => inboxNotification({ notificationCode: `n-${i}` }));
    await load(first, 21);
    expect(root().textContent).toContain('Mostrando 20 de 21 notificaciones');

    buttonWithText('Mostrar más').click();
    const request = await vi.waitFor(() => http.expectOne((r) => r.url === API));
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([inboxNotification({ notificationCode: 'n-20' })], 21, 1));
    await settle();

    expect(rows()).toHaveLength(21);
    expect(root().querySelector('button:not([disabled])')).not.toBeNull();
    expect(root().textContent).toContain('Mostrando 21 de 21 notificaciones');
    expect(root().textContent).not.toContain('Mostrar más');
  });

  it('offers a retry when it cannot load', async () => {
    const failing = await vi.waitFor(() => http.expectOne((r) => r.url === API));
    failing.flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar las notificaciones.');
    root().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await load([inboxNotification()]);

    expect(rows()).toHaveLength(1);
  });

  it('passes axe with unread and read notifications', async () => {
    await load([inboxNotification(), inboxNotification({ notificationCode: 'n-2', isRead: true })]);

    await expectNoAxeViolations(root());
  });
});
