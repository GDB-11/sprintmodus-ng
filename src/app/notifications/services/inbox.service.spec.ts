import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { InboxService, UNREAD_POLL_MS } from './inbox.service';

const API = `${environment.apiUrl}/api/notifications`;

describe('InboxService', () => {
  let service: InboxService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InboxService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stop();
    http.verify();
    vi.useRealTimers();
  });

  const answerCount = (count: number) => http.expectOne(`${API}/unread-count`).flush({ count });

  it('asks for the unread count when it starts, and again every 60 seconds', () => {
    service.start();
    answerCount(2);
    expect(service.unreadCount()).toBe(2);

    vi.advanceTimersByTime(UNREAD_POLL_MS - 1);
    http.expectNone(`${API}/unread-count`);
    vi.advanceTimersByTime(1);
    answerCount(3);

    expect(service.unreadCount()).toBe(3);
  });

  it('starts only once however many times it is asked to', () => {
    service.start();
    service.start();

    answerCount(0);
    vi.advanceTimersByTime(UNREAD_POLL_MS);
    answerCount(0);
  });

  it('asks again when the window gets focus back', () => {
    service.start();
    answerCount(1);

    window.dispatchEvent(new Event('focus'));

    answerCount(4);
    expect(service.unreadCount()).toBe(4);
  });

  it('does not poll while the tab is hidden', () => {
    service.start();
    answerCount(1);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);

    vi.advanceTimersByTime(UNREAD_POLL_MS);
    http.expectNone(`${API}/unread-count`);
    hidden.mockReturnValue(false);
    vi.advanceTimersByTime(UNREAD_POLL_MS);
    answerCount(1);
    hidden.mockRestore();
  });

  it('keeps the last number when a poll fails', () => {
    service.start();
    answerCount(5);

    vi.advanceTimersByTime(UNREAD_POLL_MS);
    http.expectOne(`${API}/unread-count`).flush(null, { status: 503, statusText: 'Unavailable' });

    expect(service.unreadCount()).toBe(5);
  });

  it('announces new notifications, but not the first number nor a lower one', () => {
    service.start();
    answerCount(2);
    expect(service.announcement()).toBe('');

    vi.advanceTimersByTime(UNREAD_POLL_MS);
    answerCount(3);
    expect(service.announcement()).toBe('Tienes 3 notificaciones sin leer.');

    service.announcement.set('');
    vi.advanceTimersByTime(UNREAD_POLL_MS);
    answerCount(1);
    expect(service.announcement()).toBe('');

    vi.advanceTimersByTime(UNREAD_POLL_MS);
    answerCount(2);
    expect(service.announcement()).toBe('Tienes 2 notificaciones sin leer.');
  });

  it('forgets the count and stops polling when the session ends', () => {
    service.start();
    answerCount(3);

    service.stop();
    vi.advanceTimersByTime(UNREAD_POLL_MS * 3);
    window.dispatchEvent(new Event('focus'));

    http.expectNone(`${API}/unread-count`);
    expect(service.unreadCount()).toBeNull();
  });

  it('asks for a page of notifications, newest first, optionally only the unread ones', () => {
    service.list(1, 20, true).subscribe();

    const request = http.expectOne((r) => r.url === API);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('unread')).toBe('true');
    request.flush({ items: [], total: 0, page: 1, size: 20 });
  });

  it('marks one as read and asks for the count again', () => {
    service.markRead('n-1').subscribe();

    const request = http.expectOne(`${API}/n-1/read`);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
    answerCount(1);

    expect(service.unreadCount()).toBe(1);
  });

  it('marks all as read and the count is zero at once', () => {
    service.unreadCount.set(7);
    service.markAllRead().subscribe();

    const request = http.expectOne(`${API}/read-all`);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.unreadCount()).toBe(0);
  });
});
