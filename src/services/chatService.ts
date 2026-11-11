import {
  endBefore,
  get,
  increment,
  limitToLast,
  onDisconnect,
  onValue,
  orderByKey,
  push,
  query,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  startAt,
  update,
} from 'firebase/database';
import { database } from './firebase';
import { getChatId } from '../utils/chat';
import type {
  ChatIndex,
  ConversationInfo,
  Message,
  MessageInput,
  ReadReceipt,
} from '../types';

export type OnError = (error: Error) => void;
export const PAGE_SIZE = 20;
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'] as const;
export function preview(message: MessageInput & { recalled?: boolean }) {
  return message.recalled
    ? 'Tin nhắn đã được thu hồi'
    : message.type === 'image'
    ? '📷 Hình ảnh'
    : message.type === 'location'
    ? '📍 Vị trí'
    : message.text;
}
export async function conversationInfo(
  convId: string,
): Promise<ConversationInfo> {
  const snapshot = await get(ref(database, `conversations/${convId}`));
  if (!snapshot.exists()) {
    throw new Error('Không tìm thấy cuộc trò chuyện.');
  }
  return snapshot.val();
}
export async function ensureDirectConversation(uid: string, peer: string) {
  const convId = `d_${getChatId(uid, peer)}`;
  const target = ref(database, `conversations/${convId}`);
  // Immutable deterministic membership. If both clients create at once, use winner.
  if (!(await get(target)).exists()) {
    try {
      await set(target, {
        type: 'direct',
        initialPeers: { first: peer },
        name: '',
        members: { [uid]: true, [peer]: true },
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      if (!(await get(target)).exists()) {
        throw error;
      }
    }
  }
  const existing = (await get(target)).val() as ConversationInfo;
  if (
    existing.type !== 'direct' ||
    Object.keys(existing.members).length !== 2 ||
    !existing.members[uid] ||
    !existing.members[peer]
  ) {
    throw new Error('Cuộc trò chuyện trực tiếp có thành viên không hợp lệ.');
  }
  return convId;
}
function validateInput(input: MessageInput) {
  if (
    !['text', 'image', 'location'].includes(input.type) ||
    !input.text.trim() ||
    input.text.trim().length > 2000
  ) {
    throw new Error('Tin nhắn cần có từ 1 đến 2000 ký tự.');
  }
  if (
    input.type === 'image' &&
    !/^https:\/\/res\.cloudinary\.com\//.test(input.imageUrl ?? '')
  ) {
    throw new Error('Ảnh phải được tải lên Cloudinary trước khi gửi.');
  }
  if (
    input.type === 'location' &&
    (!Number.isFinite(input.lat) ||
      !Number.isFinite(input.lng) ||
      Math.abs(input.lat!) > 90 ||
      Math.abs(input.lng!) > 180)
  ) {
    throw new Error('Tọa độ vị trí không hợp lệ.');
  }
}
export async function sendMessage(
  uid: string,
  convId: string,
  input: MessageInput,
  retryId?: string,
) {
  validateInput(input);
  const info = await conversationInfo(convId);
  if (!info.members[uid]) {
    throw new Error('Bạn không thuộc cuộc trò chuyện.');
  }
  const id = retryId ?? push(ref(database, `messages/${convId}`)).key!;
  if (
    retryId &&
    (await get(ref(database, `messages/${convId}/${id}`))).exists()
  ) {
    return id;
  }
  const active =
    (await get(ref(database, `activeChats/${convId}`))).val() ?? {};
  const text = preview(input);
  const changes: Record<string, unknown> = {
    [`messages/${convId}/${id}`]: {
      ...input,
      text: input.text.trim(),
      senderId: uid,
      createdAt: serverTimestamp(),
      recalled: false,
    },
  };
  for (const member of Object.keys(info.members)) {
    const path = `userChats/${member}/${convId}`;
    changes[`${path}/lastMessage`] = text;
    changes[`${path}/lastMessageId`] = id;
    changes[`${path}/lastSenderId`] = uid;
    changes[`${path}/updatedAt`] = serverTimestamp();
    // Sender's unread may already contain incoming messages. Never erase it here.
    if (member === uid) {
      changes[`${path}/unread`] = increment(0);
    } else {
      changes[`${path}/unread`] = increment(1);
      if (!Object.keys(active[member] ?? {}).length) {
        changes[`notifications/${member}/message_${id}`] = {
          type: 'message',
          convId,
          fromUid: uid,
          messageId: id,
          text,
          createdAt: serverTimestamp(),
          read: false,
        };
      }
    }
  }
  // Message + every preview + atomic counter increments + notification in ONE write.
  await update(ref(database), changes);
  return id;
}
export function newMessageId(convId: string) {
  return push(ref(database, `messages/${convId}`)).key!;
}
function rows(value: Record<string, Omit<Message, 'id'>> | null): Message[] {
  return Object.entries(value ?? {})
    .map(([id, message]) => ({ ...message, id }))
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}
export function watchLatestMessages(
  convId: string,
  callback: (messages: Message[]) => void,
  onError: OnError,
) {
  return onValue(
    query(
      ref(database, `messages/${convId}`),
      orderByKey(),
      limitToLast(PAGE_SIZE),
    ),
    s => callback(rows(s.val())),
    onError,
  );
}
export async function loadMessagePage(convId: string, before?: string) {
  const source = ref(database, `messages/${convId}`);
  const target = before
    ? query(source, orderByKey(), endBefore(before), limitToLast(PAGE_SIZE))
    : query(source, orderByKey(), limitToLast(PAGE_SIZE));
  return rows((await get(target)).val());
}
// Old pages remain live too: recalls/reactions update even far back in history.
export function watchMessagePage(
  convId: string,
  before: string,
  callback: (messages: Message[]) => void,
  onError: OnError,
) {
  return onValue(
    query(
      ref(database, `messages/${convId}`),
      orderByKey(),
      endBefore(before),
      limitToLast(PAGE_SIZE),
    ),
    s => callback(rows(s.val())),
    onError,
  );
}
export function watchConversation(
  convId: string,
  callback: (info: ConversationInfo) => void,
  onError: OnError,
) {
  return onValue(
    ref(database, `conversations/${convId}`),
    s => {
      if (s.exists()) {
        callback(s.val());
      }
    },
    onError,
  );
}
export function watchReadStatus(
  convId: string,
  callback: (receipts: Record<string, ReadReceipt>) => void,
  onError: OnError,
) {
  return onValue(
    ref(database, `readStatus/${convId}`),
    s => callback(s.val() ?? {}),
    onError,
  );
}
// A transient get() does not keep RTDB's transaction cache alive. Keep a
// subscription until the CAS completes, including its automatic server retries.
async function mutateIndex(
  uid: string,
  convId: string,
  mutate: (row: ChatIndex | null) => ChatIndex | undefined,
) {
  const target = ref(database, `userChats/${uid}/${convId}`);
  let stop = () => {};
  try {
    await new Promise<void>((resolve, reject) => {
      stop = onValue(target, () => resolve(), reject);
    });
    return await runTransaction(target, mutate, { applyLocally: false });
  } finally {
    stop();
  }
}
export async function markRead(
  uid: string,
  convId: string,
  latest: Pick<Message, 'id' | 'createdAt'>,
) {
  // Advance monotonically, including when an older page gets mounted later.
  await runTransaction(
    ref(database, `readStatus/${convId}/${uid}`),
    (current: ReadReceipt | null) => {
      if (current && current.messageId >= latest.id) {
        return;
      }
      return {
        at: serverTimestamp(),
        messageId: latest.id,
      };
    },
    { applyLocally: false },
  );
  await mutateIndex(uid, convId, current => {
    if (!current || current.lastMessageId !== latest.id || !current.unread) {
      return;
    }
    return { ...current, unread: 0 };
  });
}
export async function recallMessage(
  uid: string,
  convId: string,
  messageId: string,
) {
  const message = (
    await get(ref(database, `messages/${convId}/${messageId}`))
  ).val();
  if (!message || message.senderId !== uid) {
    throw new Error('Chỉ được thu hồi tin của mình.');
  }
  await update(ref(database, `messages/${convId}/${messageId}`), {
    recalled: true,
  });
  const info = await conversationInfo(convId);
  // CAS transaction avoids overwriting a newer preview if a new message races recall.
  await Promise.all(
    Object.keys(info.members).map(member =>
      mutateIndex(member, convId, index => {
        if (!index || index.lastMessageId !== messageId) {
          return;
        }
        return { ...index, lastMessage: 'Tin nhắn đã được thu hồi' };
      }),
    ),
  );
}
export async function reactToMessage(
  uid: string,
  convId: string,
  messageId: string,
  emoji: string,
) {
  if (!REACTIONS.includes(emoji as (typeof REACTIONS)[number])) {
    throw new Error('Cảm xúc không hợp lệ.');
  }
  const message = (
    await get(ref(database, `messages/${convId}/${messageId}`))
  ).val();
  if (!message || message.recalled) {
    throw new Error('Tin đã được thu hồi.');
  }
  const changes: Record<string, unknown> = {
    [`messages/${convId}/${messageId}/reactions/${uid}`]:
      message.reactions?.[uid] === emoji ? null : emoji,
  };
  if (message.senderId !== uid && message.reactions?.[uid] !== emoji) {
    const id = push(ref(database, `notifications/${message.senderId}`)).key!;
    changes[`notifications/${message.senderId}/${id}`] = {
      type: 'reaction',
      convId,
      fromUid: uid,
      messageId,
      text: `Đã thả ${emoji} vào tin nhắn của bạn`,
      createdAt: serverTimestamp(),
      read: false,
    };
  }
  await update(ref(database), changes);
}
export function watchTyping(
  convId: string,
  callback: (typing: Record<string, Record<string, number>>) => void,
  onError: OnError,
) {
  return onValue(
    ref(database, `typing/${convId}`),
    s => callback(s.val() ?? {}),
    onError,
  );
}
export function startTyping(uid: string, convId: string, onError: OnError) {
  const target = push(ref(database, `typing/${convId}/${uid}`));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let connected = false,
    stopped = false,
    wantsTyping = false;
  let queue = Promise.resolve();
  const write = () => {
    queue = queue
      .then(async () => {
        if (!connected || stopped) {
          return;
        }
        await onDisconnect(target).remove();
        if (stopped) {
          return;
        }
        if (wantsTyping) {
          await set(target, serverTimestamp());
        } else {
          await remove(target);
        }
      })
      .catch(onError);
  };
  const off = onValue(
    ref(database, '.info/connected'),
    s => {
      connected = s.val() === true;
      write();
    },
    onError,
  );
  return {
    changed(value: boolean) {
      wantsTyping = value;
      clearTimeout(timer);
      write();
      if (value) {
        timer = setTimeout(() => {
          wantsTyping = false;
          write();
        }, 3000);
      }
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      off();
      if (connected) {
        queue.then(() => remove(target)).catch(onError);
      }
    },
  };
}
export function enterConversation(
  uid: string,
  convId: string,
  onError: OnError,
) {
  const target = push(ref(database, `activeChats/${convId}/${uid}`));
  let stopped = false;
  let pending = Promise.resolve();
  let connected = false;
  const off = onValue(
    ref(database, '.info/connected'),
    s => {
      connected = s.val() === true;
      if (connected) {
        pending = pending
          .then(async () => {
            await onDisconnect(target).remove();
            if (!stopped) {
              await set(target, true);
            }
          })
          .catch(onError);
      }
    },
    onError,
  );
  return async () => {
    stopped = true;
    off();
    if (connected) {
      await pending;
      await remove(target);
    }
  };
}

export function watchLoadedMessages(
  convId: string,
  oldest: string,
  callback: (messages: Message[]) => void,
  onError: OnError,
) {
  return onValue(
    query(ref(database, `messages/${convId}`), orderByKey(), startAt(oldest)),
    s => callback(rows(s.val())),
    onError,
  );
}
