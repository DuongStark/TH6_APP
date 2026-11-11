import { get, onValue, ref, update } from 'firebase/database';
import { database } from './firebase';
import type { ChatNotification } from '../types';
import type { OnError } from './chatService';
export function watchNotifications(
  uid: string,
  callback: (notifications: ChatNotification[]) => void,
  onError: OnError,
) {
  return onValue(
    ref(database, `notifications/${uid}`),
    snapshot => {
      callback(
        Object.entries(snapshot.val() ?? {})
          .map(([id, data]) => ({
            ...(data as Omit<ChatNotification, 'id'>),
            id,
          }))
          .sort(
            (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
          ),
      );
    },
    onError,
  );
}
export async function markNotificationRead(uid: string, id: string) {
  await update(ref(database, `notifications/${uid}/${id}`), { read: true });
}
export async function markAllNotificationsRead(uid: string) {
  const snapshot = await get(ref(database, `notifications/${uid}`));
  const changes: Record<string, boolean> = {};
  snapshot.forEach(child => {
    if (!child.val().read) {
      changes[`${child.key}/read`] = true;
    }
  });
  if (Object.keys(changes).length) {
    await update(ref(database, `notifications/${uid}`), changes);
  }
}
