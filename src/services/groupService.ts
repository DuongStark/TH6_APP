import {
  get,
  push,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { database } from './firebase';

export async function createGroup(
  uid: string,
  name: string,
  selected: string[],
) {
  const peers = [...new Set(selected)].filter(id => id !== uid);
  if (
    !name.trim() ||
    name.trim().length > 80 ||
    peers.length < 2 ||
    peers.length > 49
  ) {
    throw new Error(
      'Nhập tên nhóm 1–80 ký tự và chọn từ 2 đến 49 thành viên khác.',
    );
  }
  const profiles = await Promise.all(
    peers.map(id => get(ref(database, `users/${id}`))),
  );
  if (profiles.some(s => !s.exists())) {
    throw new Error('Có thành viên không tồn tại.');
  }
  const convId = `g_${push(ref(database, 'conversations')).key!}`;
  const members = Object.fromEntries([uid, ...peers].map(id => [id, true]));
  await set(ref(database, `conversations/${convId}`), {
    type: 'group',
    initialPeers: { first: peers[0], second: peers[1] },
    name: name.trim(),
    members,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  const changes: Record<string, unknown> = {};
  for (const member of Object.keys(members)) {
    changes[`userChats/${member}/${convId}`] = {
      lastMessage: 'Nhóm mới được tạo',
      lastMessageId: '',
      lastSenderId: uid,
      updatedAt: serverTimestamp(),
      unread: 0,
    };
    if (member !== uid) {
      changes[`notifications/${member}/group_${convId}`] = {
        type: 'group',
        convId,
        fromUid: uid,
        text: `Bạn được thêm vào nhóm ${name.trim()}`,
        createdAt: serverTimestamp(),
        read: false,
      };
    }
  }
  await update(ref(database), changes);
  return convId;
}
