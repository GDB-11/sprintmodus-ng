import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  BoardError,
  StatusChangedEvent,
  CommentAddedEvent,
  ConnectionStatus,
  ItemMovedEvent,
  ItemsReorderedEvent,
  OnlineUser,
  UserTypingEvent,
} from './models/board.models';
import { BoardWebSocketService } from './services/board-websocket.service';

/** Stands in for the live board in screen specs: the test raises events and reads what the screen asked of the board. */
export class FakeBoard {
  readonly statusChanged$ = new Subject<StatusChangedEvent>();
  readonly itemMoved$ = new Subject<ItemMovedEvent>();
  readonly itemsReordered$ = new Subject<ItemsReorderedEvent>();
  readonly commentAdded$ = new Subject<CommentAddedEvent>();
  readonly userTyping$ = new Subject<UserTypingEvent>();
  readonly errors$ = new Subject<BoardError>();
  readonly refresh$ = new Subject<void>();
  readonly connectionStatus = signal<ConnectionStatus>('connected');
  readonly usersOnline = signal<readonly OnlineUser[]>([]);
  readonly connect = vi.fn();
  readonly release = vi.fn();
  readonly moveItem = vi.fn(() => true);
  readonly notifyTyping = vi.fn(() => true);
}

/** Provide it, then `TestBed.inject(BoardWebSocketService) as unknown as FakeBoard` to drive it. */
export const provideFakeBoard = () => ({ provide: BoardWebSocketService, useClass: FakeBoard });
