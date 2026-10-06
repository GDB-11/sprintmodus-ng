import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../testing/axe';
import { ConnectionStatus, OnlineUser } from '../../../board/models/board.models';
import { BoardWebSocketService } from '../../../board/services/board-websocket.service';
import { ConnectionIndicator } from './connection-indicator';

@Component({ template: '' })
class Dummy {}

describe('ConnectionIndicator', () => {
  const status = signal<ConnectionStatus>('connecting');
  const usersOnline = signal<readonly OnlineUser[]>([]);
  const board = { connectionStatus: status.asReadonly(), usersOnline: usersOnline.asReadonly(), connect: vi.fn(), release: vi.fn() };
  let fixture: ComponentFixture<ConnectionIndicator>;
  let router: Router;

  beforeEach(async () => {
    status.set('connecting');
    usersOnline.set([]);
    board.connect.mockClear();
    board.release.mockClear();
    await TestBed.configureTestingModule({
      imports: [ConnectionIndicator],
      providers: [
        { provide: BoardWebSocketService, useValue: board },
        provideRouter([{ path: 'other', component: Dummy }]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ConnectionIndicator);
    fixture.componentRef.setInput('projectCode', 'p-1');
    fixture.detectChanges();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ').trim();
  const statusLine = () => (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')!;

  it('opens the board of its project and follows it when the project changes', () => {
    expect(board.connect).toHaveBeenCalledWith('p-1');

    fixture.componentRef.setInput('projectCode', 'p-2');
    fixture.detectChanges();

    expect(board.connect).toHaveBeenLastCalledWith('p-2');
  });

  it('lets go of the board when it leaves the screen', () => {
    fixture.destroy();

    expect(board.release).toHaveBeenCalled();
  });

  it('re-asserts connect() on every navigation, so it reclaims a connection another instance released', async () => {
    board.connect.mockClear();

    await router.navigateByUrl('/other');

    expect(board.connect).toHaveBeenCalledWith('p-1');
  });

  it.each<[ConnectionStatus, string]>([
    ['connecting', 'Conectando'],
    ['connected', 'Conectado'],
    ['reconnecting', 'Reconectando'],
    ['offline', 'Sin conexión'],
  ])('says in words when the connection is %s', (state, words) => {
    status.set(state);
    fixture.detectChanges();

    expect(statusLine().textContent).toContain(words);
  });

  it('hides the dot from assistive technology: the words already say it', () => {
    expect(statusLine().querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('lists who else is online, and nothing when nobody is', () => {
    expect(text()).not.toContain('En línea');

    usersOnline.set([
      { userCode: 'u-1', email: 'ana@acme.io' },
      { userCode: 'u-2', email: 'luis@acme.io' },
    ]);
    fixture.detectChanges();

    expect(text()).toContain('En línea: ana@acme.io, luis@acme.io');
  });

  it('has no accessibility violations in any state', async () => {
    usersOnline.set([{ userCode: 'u-1', email: 'ana@acme.io' }]);
    for (const state of ['connecting', 'connected', 'reconnecting', 'offline'] as const) {
      status.set(state);
      fixture.detectChanges();
      await expectNoAxeViolations(fixture.nativeElement);
    }
  });
});
