import type { ImageSourcePropType } from 'react-native';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type Contact = {
  id: string;
  name: string;
  avatar?: ImageSourcePropType;
  online: boolean;
  lastSeen: string;
};

export type StoredMessage = {
  senderId: string;
  type: 'text' | 'location' | 'image';
  text: string;
  createdAt: number;
  recalled?: boolean;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  reactions?: Record<string, string>;
  replyTo?: { id: string; senderId: string; text: string };
  latitude?: number;
  longitude?: number;
};

export type StoredChat = {
  members?: { first: string; second: string };
  messages?: Record<string, StoredMessage>;
  receipts?: Record<string, Record<string, boolean>>;
};

export type Message = StoredMessage & {
  id: string;
  text: string;
  time?: string;
  mine?: boolean;
};

export type ConversationInfo = {
  type: 'direct' | 'group';
  name: string;
  members: Record<string, boolean>;
  createdBy: string;
  createdAt: number;
};
export type ChatIndex = {
  lastMessage: string;
  lastMessageId: string;
  lastSenderId: string;
  updatedAt: number;
  unread?: number;
};
export type Conversation = {
  id?: string;
  info?: ConversationInfo;
  contactId: string;
  unread: number;
  messages: Message[];
  updatedAt: number;
  lastMessage?: string;
  lastMessageId?: string;
};
export type ReadReceipt = { at: number; messageAt?: number; messageId: string };
export type MessageInput = Pick<
  StoredMessage,
  'type' | 'text' | 'imageUrl' | 'lat' | 'lng' | 'replyTo'
>;
export type ChatNotification = {
  id: string;
  convId: string;
  fromUid: string;
  messageId?: string;
  type: 'message' | 'group' | 'reaction';
  text: string;
  createdAt: number;
  read: boolean;
};

export type TabParams = {
  Home: undefined;
  Contacts: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type RootStackParams = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  Chat: { contactId?: string; convId?: string };
  CreateGroup: undefined;
};
