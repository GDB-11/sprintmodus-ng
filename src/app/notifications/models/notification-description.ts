import { InboxNotification } from './notification.models';

/** The sentence a notification is, from its type, who caused it and which work item it is about. */
export function describeNotification(notification: InboxNotification): string {
  const item = `${notification.workItem.displayKey} · ${notification.workItem.title}`;
  switch (notification.type) {
    case 'MENTIONED':
      return `${notification.actor.fullName} te mencionó en un comentario de ${item}`;
    default:
      // a type this version does not know yet still says where it points
      return `Tienes una notificación nueva en ${item}`;
  }
}
