import type { Conversation, StoredChat } from '../types';

export function getChatId(first: string, second: string) {
  if (!first || !second || first === second) {
    throw new Error('Cần chọn một người dùng khác để trò chuyện.');
  }
  return [first, second].sort().join('_');
}

export function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

// Tính từ các tin thực tế và xác nhận từng tin, không tăng/giảm bộ đếm cục bộ.
export function buildConversation(
  contactId: string,
  chat: StoredChat,
  uid: string,
): Conversation {
  const messages = Object.entries(chat.messages ?? {})
    .map(([id, message]) => ({
      ...message,
      id,
      mine: message.senderId === uid,
      time: formatTime(message.createdAt),
    }))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  return {
    contactId,
    messages,
    unread: messages.filter(
      message => !message.mine && !chat.receipts?.[uid]?.[message.id],
    ).length,
    updatedAt: messages.at(-1)?.createdAt ?? 0,
  };
}

export function validateRegistration(
  name: string,
  email: string,
  password: string,
  confirmation: string,
) {
  if (!name.trim() || name.trim().length > 80) {
    return 'Vui lòng nhập họ tên từ 1 đến 80 ký tự.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Vui lòng nhập email hợp lệ.';
  }
  if (password.length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự.';
  }
  if (password !== confirmation) {
    return 'Mật khẩu nhập lại không khớp.';
  }
  return '';
}
