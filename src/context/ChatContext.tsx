import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import type { Contact, Conversation, ChatNotification } from '../types';
import {
  ensureProfile,
  login,
  logout,
  watchSession,
  errorMessage,
} from '../services/auth';
import { watchContacts, watchConversations } from '../services/chat';
import { startPresence } from '../services/presence';
import * as notices from '../services/notificationService';

type Context = {
  uid: string;
  username: string | null;
  email: string;
  loading: boolean;
  dataLoading: boolean;
  error: string | null;
  contacts: Contact[];
  conversations: Conversation[];
  notifications: ChatNotification[];
  showOnline: boolean;
  notificationsEnabled: boolean;
  signIn: typeof login;
  signOut: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setShowOnline: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
};
const ChatContext = createContext<Context | undefined>(undefined);
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [showOnline, setShowOnline] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const presence = useRef<ReturnType<typeof startPresence> | null>(null);
  const visibility = useRef(true);
  useEffect(
    () =>
      watchSession(next => {
        setUser(next);
        setLoading(false);
      }),
    [],
  );
  useEffect(() => {
    setContacts([]);
    setConversations([]);
    setNotifications([]);
    setError(null);
    if (!user) {
      setDataLoading(false);
      return;
    }
    let stopped = false;
    const cleanup: (() => void)[] = [];
    setDataLoading(true);
    const onError = (err: Error) => {
      if (!stopped) {
        setError(errorMessage(err));
        setDataLoading(false);
      }
    };
    ensureProfile(user)
      .then(() => {
        if (stopped) {
          return;
        }
        presence.current = startPresence(user.uid, onError, visibility.current);
        cleanup.push(watchContacts(user.uid, setContacts, onError));
        cleanup.push(
          watchConversations(
            user.uid,
            rows => {
              setConversations(rows);
              setDataLoading(false);
            },
            onError,
          ),
        );
        cleanup.push(
          notices.watchNotifications(user.uid, setNotifications, onError),
        );
      })
      .catch(onError);
    return () => {
      stopped = true;
      cleanup.forEach(stop => stop());
      const handle = presence.current;
      presence.current = null;
      handle?.stop().catch(() => {});
    };
  }, [user]);
  return (
    <ChatContext.Provider
      value={{
        uid: user?.uid ?? '',
        username: user
          ? user.displayName || user.email?.split('@')[0] || 'Người dùng'
          : null,
        email: user?.email ?? '',
        loading,
        dataLoading,
        error,
        contacts,
        conversations,
        notifications,
        showOnline,
        notificationsEnabled,
        signIn: login,
        signOut: async () => {
          await presence.current?.stop();
          await logout();
        },
        markNotificationRead: id => notices.markNotificationRead(user!.uid, id),
        markAllNotificationsRead: () =>
          notices.markAllNotificationsRead(user!.uid),
        setShowOnline: value => {
          visibility.current = value;
          setShowOnline(value);
          presence.current?.setVisible(value);
        },
        setNotificationsEnabled,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat requires ChatProvider');
  }
  return context;
}
