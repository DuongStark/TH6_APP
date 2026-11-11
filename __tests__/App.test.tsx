import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import App from '../App';
import { login, logout, register } from '../src/services/auth';
import { sendMessage } from '../src/services/chatService';
import { markAllNotificationsRead } from '../src/services/notificationService';
import { currentLocation } from '../src/services/location';
import { buildConversation } from '../src/utils/chat';
import type { Conversation } from '../src/types';

const mockUser = {
  uid: 'alice',
  displayName: 'Nguyễn An',
  email: 'an@example.com',
};
let mockSession: (user: typeof mockUser | null) => void;
let mockChats: (chats: Conversation[]) => void;
const mockStopContacts = jest.fn();
const mockStopChats = jest.fn();
const mockStopPresence = jest.fn(async () => {});
const mockStartPresence = jest.fn(
  (_uid: string, _onError: Function, _visible?: boolean) => ({
    setVisible: jest.fn(),
    stop: mockStopPresence,
  }),
);
const mockMessages = {
  one: {
    senderId: 'bob',
    type: 'text' as const,
    text: 'Chào An',
    createdAt: 1000,
  },
  two: {
    senderId: 'bob',
    type: 'location' as const,
    text: '📍 Vị trí hiện tại',
    latitude: 21,
    longitude: 105,
    createdAt: 2000,
  },
};
const mockConversations = () => [
  {
    ...buildConversation('bob', { messages: mockMessages }, 'alice'),
    id: 'alice_bob',
    lastMessage: '📍 Vị trí',
    info: {
      type: 'direct' as const,
      name: '',
      members: { alice: true, bob: true },
      createdBy: 'alice',
      createdAt: 1,
    },
  },
];

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));
jest.mock('../src/services/uploadService', () => ({
  pickImage: jest.fn(),
  uploadImage: jest.fn(),
}));
jest.mock('../src/services/groupService', () => ({
  createGroup: jest.fn(async () => 'group'),
}));
jest.mock('../src/services/notificationService', () => ({
  watchNotifications: (_uid: string, cb: Function) => {
    cb([
      {
        id: 'n1',
        type: 'message',
        convId: 'alice_bob',
        fromUid: 'bob',
        text: 'Tin mới từ Bình',
        createdAt: 2000,
        read: false,
      },
    ]);
    return jest.fn();
  },
  markNotificationRead: jest.fn(async () => {}),
  markAllNotificationsRead: jest.fn(async () => {}),
}));
jest.mock('../src/services/chatService', () => ({
  REACTIONS: ['👍', '❤️', '😂', '😮', '😢'],
  ensureDirectConversation: jest.fn(async () => 'alice_bob'),
  watchConversation: (_id: string, cb: Function) => {
    cb({ type: 'direct', name: '', members: { alice: true, bob: true } });
    return jest.fn();
  },
  watchLatestMessages: (_id: string, cb: Function) => {
    cb([
      {
        id: 'two',
        senderId: 'bob',
        type: 'text',
        text: 'Chào An',
        createdAt: 2000,
      },
    ]);
    return jest.fn();
  },
  watchLoadedMessages: () => jest.fn(),
  watchReadStatus: () => jest.fn(),
  watchTyping: () => jest.fn(),
  enterConversation: () => jest.fn(async () => {}),
  startTyping: () => ({ changed: jest.fn(), stop: jest.fn() }),
  markRead: jest.fn(async () => {}),
  sendMessage: jest.fn(async () => 'new'),
  loadMessagePage: jest.fn(async () => []),
}));
jest.mock('../src/services/firebase', () => ({ usingEmulators: true }));
jest.mock('../src/services/auth', () => ({
  watchSession: (cb: typeof mockSession) => {
    mockSession = cb;
    cb(null);
    return jest.fn();
  },
  login: jest.fn(async () => mockSession(mockUser)),
  logout: jest.fn(async () => mockSession(null)),
  register: jest.fn(async () => {}),
  ensureProfile: jest.fn(async () => {}),
  errorMessage: (error: Error) => error.message,
}));
jest.mock('../src/services/chat', () => ({
  watchContacts: (_uid: string, cb: Function) => {
    cb([
      {
        id: 'bob',
        name: 'Trần Bình',
        online: true,
        lastSeen: 'Đang hoạt động',
      },
    ]);
    return mockStopContacts;
  },
  watchConversations: (_uid: string, cb: typeof mockChats) => {
    mockChats = cb;
    cb(mockConversations());
    return mockStopChats;
  },
  sendChatMessage: jest.fn(async () => {}),
  markMessagesRead: jest.fn(async () => {}),
}));
jest.mock('../src/services/presence', () => ({
  startPresence: (...args: Parameters<typeof mockStartPresence>) =>
    mockStartPresence(...args),
}));
jest.mock('../src/services/location', () => ({
  currentLocation: jest.fn(async () => ({ latitude: 21, longitude: 105 })),
  openLocation: jest.fn(async () => {}),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});
async function signIn() {
  fireEvent.changeText(await screen.findByLabelText('Email'), 'an@example.com');
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByLabelText('Tìm cuộc trò chuyện');
}

test('login validates fields and shows Firebase credential errors', async () => {
  render(<App />);
  fireEvent.press(await screen.findByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByText('Vui lòng nhập email.')).toBeOnTheScreen();
  expect(login).not.toHaveBeenCalled();
  jest
    .mocked(login)
    .mockRejectedValueOnce(new Error('Email hoặc mật khẩu không đúng.'));
  fireEvent.changeText(screen.getByLabelText('Email'), 'wrong@example.com');
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'wrong123');
  fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(
    await screen.findByText('Email hoặc mật khẩu không đúng.'),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText('Tìm cuộc trò chuyện')).toBeNull();
});

test('registration rejects mismatching passwords before calling Firebase', async () => {
  render(<App />);
  fireEvent.press(await screen.findByRole('button', { name: 'Tạo tài khoản' }));
  fireEvent.changeText(await screen.findByLabelText('Họ tên'), 'Nguyễn An');
  fireEvent.changeText(
    screen.getByLabelText('Email đăng ký'),
    'an@example.com',
  );
  fireEvent.changeText(screen.getByLabelText('Mật khẩu đăng ký'), '123456');
  fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu'), '654321');
  fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(screen.getByText('Mật khẩu nhập lại không khớp.')).toBeOnTheScreen();
  expect(register).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  await waitFor(() =>
    expect(register).toHaveBeenCalledWith(
      'Nguyễn An',
      'an@example.com',
      '123456',
      '123456',
    ),
  );
});

test('Home renders realtime index without duplicate conversations', async () => {
  render(<App />);
  await signIn();
  expect(screen.getByText('📍 Vị trí')).toBeOnTheScreen();
  act(() => {
    mockChats(mockConversations());
    mockChats(mockConversations());
  });
  expect(screen.getAllByText('Trần Bình')).toHaveLength(1);
});
test('chat opens from Home, sends text and shows location denial', async () => {
  render(<App />);
  await signIn();
  fireEvent.press(screen.getByText('Trần Bình'));
  const composer = await screen.findByLabelText('Nhập tin nhắn');
  expect(await screen.findByText('Chào An')).toBeOnTheScreen();
  fireEvent.changeText(composer, 'Xin chào');
  fireEvent.press(screen.getByLabelText('Gửi tin nhắn'));
  await waitFor(() =>
    expect(sendMessage).toHaveBeenCalledWith('alice', 'alice_bob', {
      type: 'text',
      text: 'Xin chào',
    }),
  );
  await waitFor(() => expect(composer).toHaveProp('value', ''));
  jest
    .mocked(currentLocation)
    .mockRejectedValueOnce(new Error('Bạn đã từ chối quyền vị trí.'));
  fireEvent.press(screen.getByLabelText('Gửi vị trí'));
  expect(
    await screen.findByText(/Bạn đã từ chối quyền vị trí/),
  ).toBeOnTheScreen();
});
test('group screen requires two peers and real notifications mark all read', async () => {
  render(<App />);
  await signIn();
  fireEvent.press(screen.getByLabelText('Tạo nhóm'));
  expect(await screen.findByLabelText('Tên nhóm')).toBeOnTheScreen();
  expect(screen.getByRole('checkbox')).toHaveProp('accessibilityState', {
    checked: false,
  });
  fireEvent.press(screen.getByText('‹ Quay lại'));
  fireEvent.press(screen.getByLabelText('Thông báo, tab'));
  expect(await screen.findByText('Tin mới từ Bình')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Đánh dấu tất cả đã đọc'));
  await waitFor(() =>
    expect(markAllNotificationsRead).toHaveBeenCalledWith('alice'),
  );
  fireEvent.press(screen.getByLabelText('Cài đặt, tab'));
  fireEvent.press(await screen.findByRole('button', { name: 'Đăng xuất' }));
  expect(await screen.findByLabelText('Email')).toHaveProp('value', '');
  expect(logout).toHaveBeenCalledTimes(1);
  expect(mockStopContacts).toHaveBeenCalledTimes(1);
  expect(mockStopChats).toHaveBeenCalledTimes(1);
});
