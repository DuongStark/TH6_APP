// Compatibility facade for profile/presence and Home. Message operations: chatService.
import { onValue, ref } from 'firebase/database';
import { database } from './firebase';
import type {
  ChatIndex,
  Contact,
  Conversation,
  ConversationInfo,
} from '../types';
import type { OnError } from './chatService';
export function lastSeenText(at?: number) {
  if (!at) {
    return 'Chưa có hoạt động';
  }
  return `Hoạt động ${Math.max(
    1,
    Math.floor((Date.now() - (at || Date.now())) / 60000),
  )} phút trước`;
}
export function watchContacts(
  uid: string,
  callback: (contacts: Contact[]) => void,
  onError: OnError,
) {
  let profiles: Record<string, { name: string; photoURL?: string }> = {};
  let states: Record<
    string,
    { connections?: Record<string, boolean>; lastSeen?: number }
  > = {};
  const publish = () =>
    callback(
      Object.entries(profiles)
        .filter(([id]) => id !== uid)
        .map(([id, profile]) => {
          const online = Object.values(states[id]?.connections ?? {}).some(
            Boolean,
          );
          return {
            id,
            name: profile.name,
            avatar: profile.photoURL ? { uri: profile.photoURL } : undefined,
            online,
            lastSeen: online
              ? 'Đang hoạt động'
              : lastSeenText(states[id]?.lastSeen),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  const a = onValue(
    ref(database, 'users'),
    s => {
      profiles = s.val() ?? {};
      publish();
    },
    onError,
  );
  const b = onValue(
    ref(database, 'presence'),
    s => {
      states = s.val() ?? {};
      publish();
    },
    onError,
  );
  const timer = setInterval(publish, 30000);
  return () => {
    a();
    b();
    clearInterval(timer);
  };
}
export function watchConversations(
  uid: string,
  callback: (chats: Conversation[]) => void,
  onError: OnError,
) {
  let index: Record<string, ChatIndex> = {};
  const infos = new Map<string, ConversationInfo>();
  const listeners = new Map<string, () => void>();
  const publish = () =>
    callback(
      Object.entries(index)
        .filter(([id]) => infos.has(id))
        .map(([id, row]) => {
          const info = infos.get(id)!;
          return {
            id,
            info,
            contactId:
              Object.keys(info.members).find(member => member !== uid) ?? uid,
            unread: row.unread ?? 0,
            updatedAt: row.updatedAt,
            lastMessage: row.lastMessage,
            lastMessageId: row.lastMessageId,
            messages: [],
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );
  const stop = onValue(
    ref(database, `userChats/${uid}`),
    s => {
      index = s.val() ?? {};
      for (const [id, off] of listeners) {
        if (!index[id]) {
          off();
          listeners.delete(id);
          infos.delete(id);
        }
      }
      for (const id of Object.keys(index)) {
        if (!listeners.has(id)) {
          listeners.set(
            id,
            onValue(
              ref(database, `conversations/${id}`),
              item => {
                if (item.exists()) {
                  infos.set(id, item.val());
                }
                publish();
              },
              onError,
            ),
          );
        }
      }
      publish();
    },
    onError,
  );
  return () => {
    stop();
    listeners.forEach(off => off());
    listeners.clear();
  };
}
