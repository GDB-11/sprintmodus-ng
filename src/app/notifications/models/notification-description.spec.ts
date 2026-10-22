import { inboxNotification } from '../testing';
import { describeNotification } from './notification-description';

describe('describeNotification', () => {
  it('says who mentioned you and where', () => {
    expect(describeNotification(inboxNotification())).toBe('Olivia Owner te mencionó en un comentario de WAR-1000 · Pay by card');
  });

  it('says who assigned you the work item', () => {
    const assigned = inboxNotification({ type: 'ASSIGNED', commentCode: undefined });

    expect(describeNotification(assigned)).toBe('Olivia Owner te asignó WAR-1000 · Pay by card');
  });

  it('still points at the work item for a type this version does not know', () => {
    const unknown = inboxNotification({ type: 'SOMETHING_NEW' as never });

    expect(describeNotification(unknown)).toBe('Tienes una notificación nueva en WAR-1000 · Pay by card');
  });
});
