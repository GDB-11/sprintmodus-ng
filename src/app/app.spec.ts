import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { FakeAuth, provideFakeAuth } from './auth/auth.testing';
import { AuthService } from './auth/services/auth.service';
import { InboxService } from './notifications/services/inbox.service';

describe('App', () => {
  const inbox = { start: vi.fn(), stop: vi.fn() };

  beforeEach(async () => {
    inbox.start.mockClear();
    inbox.stop.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideFakeAuth(), { provide: InboxService, useValue: inbox }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('polls the unread notifications for as long as somebody is signed in', async () => {
    const auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    const fixture = TestBed.createComponent(App);

    await fixture.whenStable();
    expect(inbox.start).toHaveBeenCalledTimes(1);
    expect(inbox.stop).not.toHaveBeenCalled();

    auth.currentUser.set(null);
    await fixture.whenStable();
    expect(inbox.stop).toHaveBeenCalledTimes(1);
  });

  it('does not poll while nobody is signed in', async () => {
    const auth = TestBed.inject(AuthService) as unknown as FakeAuth;
    auth.currentUser.set(null);
    const fixture = TestBed.createComponent(App);

    await fixture.whenStable();

    expect(inbox.start).not.toHaveBeenCalled();
    expect(inbox.stop).toHaveBeenCalled();
  });
});
