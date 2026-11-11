import {
  buildConversation,
  getChatId,
  validateRegistration,
} from '../src/utils/chat';

const messages = {
  first: {
    senderId: 'bob',
    type: 'text' as const,
    text: 'Xin chào',
    createdAt: 100,
  },
  second: {
    senderId: 'alice',
    type: 'location' as const,
    text: '📍 Vị trí hiện tại',
    latitude: 21,
    longitude: 105,
    createdAt: 200,
  },
  third: {
    senderId: 'bob',
    type: 'text' as const,
    text: 'Đã thấy',
    createdAt: 300,
  },
};

test('both participants use the same chat ID', () => {
  expect(getChatId('alice', 'bob')).toBe(getChatId('bob', 'alice'));
  expect(() => getChatId('alice', 'alice')).toThrow();
});

test('counts only incoming messages without receipts, even at equal timestamps', () => {
  const chat = buildConversation(
    'bob',
    { messages, receipts: { alice: { first: true } } },
    'alice',
  );
  expect(chat.unread).toBe(1);
  expect(chat.messages.map(message => message.mine)).toEqual([
    false,
    true,
    false,
  ]);
  expect(chat.updatedAt).toBe(300);
  expect(chat.messages[1].latitude).toBe(21);
  const sameTime = {
    ...messages,
    fourth: { ...messages.third, createdAt: 300 },
  };
  expect(
    buildConversation(
      'bob',
      { messages: sameTime, receipts: { alice: { first: true, third: true } } },
      'alice',
    ).unread,
  ).toBe(1);
});

test('reading a snapshot does not mark a concurrently arriving message as read', () => {
  const chat = buildConversation(
    'bob',
    { messages, receipts: { alice: { first: true, third: true } } },
    'alice',
  );
  expect(chat.unread).toBe(0);
  expect(
    buildConversation(
      'bob',
      {
        messages: {
          ...messages,
          fourth: { ...messages.first, createdAt: 400 },
        },
        receipts: { alice: { first: true, third: true } },
      },
      'alice',
    ).unread,
  ).toBe(1);
});

test('registration requires name, valid email, six characters and matching confirmation', () => {
  expect(validateRegistration('', 'a@example.com', '123456', '123456')).toMatch(
    /họ tên/,
  );
  expect(validateRegistration('An', 'wrong', '123456', '123456')).toMatch(
    /email/i,
  );
  expect(validateRegistration('An', 'a@example.com', '12345', '12345')).toMatch(
    /6/,
  );
  expect(
    validateRegistration('An', 'a@example.com', '123456', '654321'),
  ).toMatch(/khớp/);
  expect(
    validateRegistration(' An ', ' a@example.com ', '123456', '123456'),
  ).toBe('');
});
