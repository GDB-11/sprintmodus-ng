import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = TestBed.inject(NotificationService);
  });

  it('keeps notifications in the order they were raised until dismissed', () => {
    service.warning('First');
    service.error('Second');

    expect(service.notifications().map((n) => [n.kind, n.message])).toEqual([
      ['warning', 'First'],
      ['error', 'Second'],
    ]);

    service.dismiss(service.notifications()[0].id);

    expect(service.notifications().map((n) => n.message)).toEqual(['Second']);
  });

  it('drops the oldest message once too many are showing', () => {
    for (let i = 1; i <= 7; i++) {
      service.info(`Message ${i}`);
    }

    expect(service.notifications().map((n) => n.message)).toEqual([
      'Message 3',
      'Message 4',
      'Message 5',
      'Message 6',
      'Message 7',
    ]);
  });
});
