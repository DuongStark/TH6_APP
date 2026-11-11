import {SafeAreaView} from 'react-native-safe-area-context';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Asset } from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import type {
  ConversationInfo,
  Message,
  ReadReceipt,
  RootStackParams,
} from '../types';
import { useChat } from '../context/ChatContext';
import * as chat from '../services/chatService';
import { pickImage, uploadImage } from '../services/uploadService';
import { currentLocation, openLocation } from '../services/location';
import { formatTime } from '../utils/chat';
import { colors, shared } from '../theme';

type PendingImage = {
  id: string;
  asset: Asset;
  error?: string;
  imageUrl?: string;
  messageId?: string;
};
export function ChatScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, 'Chat'>) {
  const { uid, contacts, username, showOnline } = useChat();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const active = focused && foreground;
  const [convId, setConvId] = useState(route.params.convId ?? '');
  const [info, setInfo] = useState<ConversationInfo>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [oldest, setOldest] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState<Message>();
  const [selected, setSelected] = useState<Message>();
  const [image, setImage] = useState('');
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [receipts, setReceipts] = useState<Record<string, ReadReceipt>>({});
  const [typing, setTyping] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [now, setNow] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<Message>>(null);
  const typer = useRef<ReturnType<typeof chat.startTyping> | null>(null);
  const pageLock = useRef(false);
  const jumpTarget = useRef('');
  const uploadLock = useRef(new Set<string>());
  const onError = useCallback((e: Error) => setError(e.message), []);
  const nameOf = useCallback(
    (id: string) =>
      id === uid
        ? username || 'Bạn'
        : contacts.find(c => c.id === id)?.name || 'Thành viên',
    [contacts, uid, username],
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (route.params.convId) {
      return;
    }
    let stopped = false;
    chat
      .ensureDirectConversation(uid, route.params.contactId!)
      .then(id => {
        if (!stopped) {
          setConvId(id);
        }
      })
      .catch(onError);
    return () => {
      stopped = true;
    };
  }, [uid, route.params.convId, route.params.contactId, onError]);
  useEffect(() => {
    if (!convId || !active) {
      return;
    }
    const stops = [
      chat.watchConversation(convId, setInfo, onError),
      chat.watchLatestMessages(
        convId,
        rows => {
          setMessages(current => merge(current, rows));
          setReady(true);
          setOldest(current => current || rows.at(-1)?.id || '');
          if (rows.length < 20) {
            setHasMore(false);
          }
        },
        onError,
      ),
      chat.watchReadStatus(convId, setReceipts, onError),
      chat.watchTyping(convId, setTyping, onError),
    ];
    const leave = chat.enterConversation(uid, convId, onError);
    const handle = chat.startTyping(uid, convId, onError);
    typer.current = handle;
    return () => {
      stops.forEach(stop => stop());
      handle.stop();
      typer.current = null;
      leave().catch(onError);
    };
  }, [uid, convId, active, onError]);
  useEffect(() => {
    if (!convId || !oldest || !active) {
      return;
    }
    return chat.watchLoadedMessages(
      convId,
      oldest,
      rows => setMessages(current => merge(current, rows)),
      onError,
    );
  }, [convId, oldest, active, onError]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const newest = messages[0];
  useEffect(() => {
    if (active && ready && newest && convId) {
      chat.markRead(uid, convId, newest).catch(onError);
    }
  }, [active, ready, newest?.id, newest?.createdAt, convId, uid, onError]); // eslint-disable-line react-hooks/exhaustive-deps
  const peer = contacts.find(
    c => c.id === Object.keys(info?.members ?? {}).find(id => id !== uid),
  );
  const typingNames = Object.entries(typing)
    .filter(
      ([id, connections]) =>
        id !== uid && Object.values(connections).some(at => now - at < 3000),
    )
    .map(([id]) => nameOf(id));
  const online = Object.keys(info?.members ?? {}).filter(id =>
    id === uid ? showOnline : contacts.find(c => c.id === id)?.online,
  ).length;
  const subtitle = typingNames.length
    ? `${
        info?.type === 'group' ? typingNames.join(', ') + ' ' : ''
      }đang soạn tin…`
    : info?.type === 'group'
    ? `${Object.keys(info.members).length} thành viên · ${online} đang online`
    : peer?.online
    ? 'Đang hoạt động'
    : peer?.lastSeen || 'Chưa có hoạt động';
  const filtered = useMemo(
    () =>
      messages.filter(
        m =>
          !search ||
          (!m.recalled &&
            m.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
      ),
    [messages, search],
  );
  const lastMine = messages.find(m => m.senderId === uid);
  const readers = lastMine
    ? Object.entries(receipts).filter(
        ([id, r]) => id !== uid && r.messageId >= lastMine.id,
      )
    : [];
  const seenTime = readers.length
    ? Math.max(...readers.map(([, r]) => r.at))
    : 0;
  async function loadOlder() {
    if (!convId || !oldest || pageLock.current || !hasMore) {
      return;
    }
    pageLock.current = true;
    setPageLoading(true);
    try {
      const rows = await chat.loadMessagePage(convId, oldest);
      setMessages(current => merge(current, rows));
      if (rows.length) {
        setOldest(rows.at(-1)!.id);
      }
      setHasMore(rows.length === 20);
      return rows;
    } catch (e) {
      onError(e as Error);
    } finally {
      pageLock.current = false;
      setPageLoading(false);
    }
  }
  async function sendText() {
    if (!convId || !text.trim() || sending) {
      return;
    }
    setSending(true);
    typer.current?.changed(false);
    try {
      await chat.sendMessage(uid, convId, {
        type: 'text',
        text,
        ...(reply
          ? {
              replyTo: {
                id: reply.id,
                senderId: reply.senderId,
                text: chat.preview(reply),
              },
            }
          : {}),
      });
      setText('');
      setReply(undefined);
      setError('');
    } catch (e) {
      onError(e as Error);
    } finally {
      setSending(false);
    }
  }
  async function sendLocation() {
    if (!convId || sending) {
      return;
    }
    setSending(true);
    typer.current?.changed(false);
    try {
      const coordinates = await currentLocation();
      await chat.sendMessage(uid, convId, {
        type: 'location',
        text: '📍 Vị trí',
        lat: coordinates.latitude,
        lng: coordinates.longitude,
      });
    } catch (e) {
      onError(e as Error);
    } finally {
      setSending(false);
    }
  }
  async function upload(item: PendingImage) {
    if (uploadLock.current.has(item.id)) {
      return;
    }
    uploadLock.current.add(item.id);
    setPending(current =>
      current.map(p => (p.id === item.id ? { ...p, error: undefined } : p)),
    );
    let imageUrl = item.imageUrl;
    let messageId = item.messageId;
    try {
      imageUrl = imageUrl || (await uploadImage(item.asset));
      messageId = messageId || chat.newMessageId(convId);
      setPending(current =>
        current.map(p =>
          p.id === item.id ? { ...p, imageUrl, messageId } : p,
        ),
      );
      await chat.sendMessage(
        uid,
        convId,
        { type: 'image', text: '📷 Hình ảnh', imageUrl },
        messageId,
      );
      setPending(current => current.filter(p => p.id !== item.id));
    } catch (e) {
      setPending(current =>
        current.map(p =>
          p.id === item.id
            ? { ...p, imageUrl, messageId, error: (e as Error).message }
            : p,
        ),
      );
    } finally {
      uploadLock.current.delete(item.id);
    }
  }
  async function choose(camera: boolean) {
    try {
      const asset = await pickImage(camera);
      if (!asset || !convId) {
        return;
      }
      typer.current?.changed(false);
      const item = { id: chat.newMessageId(convId), asset };
      setPending(current => [...current, item]);
      await upload(item);
    } catch (e) {
      Alert.alert('Không mở được ảnh', (e as Error).message);
    }
  }
  async function jump(id: string) {
    setSearch('');
    if (!messages.some(m => m.id === id)) {
      let cursor = oldest;
      let found = false;
      try {
        while (cursor && !found) {
          const rows = await chat.loadMessagePage(convId, cursor);
          if (!rows.length) {
            break;
          }
          setMessages(current => merge(current, rows));
          cursor = rows.at(-1)!.id;
          setOldest(cursor);
          found = rows.some(m => m.id === id);
        }
        if (!found) {
          Alert.alert('Trả lời', 'Không tìm thấy tin gốc.');
          return;
        }
      } catch (e) {
        onError(e as Error);
        return;
      }
    }
    jumpTarget.current = id;
    setNow(Date.now());
  }
  useEffect(() => {
    if (jumpTarget.current) {
      const index = filtered.findIndex(m => m.id === jumpTarget.current);
      if (index >= 0) {
        list.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        jumpTarget.current = '';
      }
    }
  }, [filtered, now]);
  function action(fn: () => Promise<unknown> | void) {
    setSelected(undefined);
    Promise.resolve()
      .then(fn)
      .catch(e => Alert.alert('Không thực hiện được', e.message));
  }
  return (
    <SafeAreaView style={shared.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Quay lại"
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.title}>
              {info?.type === 'group'
                ? info.name
                : peer?.name || 'Cuộc trò chuyện'}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>
        </View>
        <TextInput
          accessibilityLabel="Tìm nội dung tin nhắn"
          placeholder="Tìm trong tin đã tải…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        {!!search && (
          <Text style={styles.searchNote}>
            {filtered.length} kết quả trong {messages.length} tin đã tải
          </Text>
        )}
        {!!error && (
          <Pressable onPress={() => setError('')}>
            <Text style={styles.error}>{error} ×</Text>
          </Pressable>
        )}
        {!ready && !error && <ActivityIndicator color={colors.primary} />}
        <FlatList
          ref={list}
          inverted
          data={filtered}
          keyExtractor={m => m.id}
          style={styles.flex}
          contentContainerStyle={styles.list}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReached={() => {
            if (!search) {
              loadOlder();
            }
          }}
          onEndReachedThreshold={0.1}
          onScrollToIndexFailed={event => {
            list.current?.scrollToOffset({
              offset: event.averageItemLength * event.index,
              animated: true,
            });
            jumpTarget.current = filtered[event.index]?.id ?? '';
          }}
          ListFooterComponent={
            pageLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : hasMore && ready ? (
              <Pressable onPress={loadOlder}>
                <Text style={styles.load}>Tải thêm 20 tin cũ</Text>
              </Pressable>
            ) : (
              <Text style={styles.load}>Bắt đầu cuộc trò chuyện</Text>
            )
          }
          ListHeaderComponent={
            <View>
              {pending
                .filter(p => !messages.some(m => m.id === p.id))
                .map(item => (
                  <View
                    key={item.id}
                    style={[styles.bubble, styles.mine, styles.pending]}
                  >
                    <Image
                      source={{ uri: item.asset.uri }}
                      style={styles.photo}
                    />
                    {item.error ? (
                      <>
                        <Text style={styles.error}>{item.error}</Text>
                        <Pressable onPress={() => upload(item)}>
                          <Text style={styles.link}>Thử lại</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            setPending(current =>
                              current.filter(p => p.id !== item.id),
                            )
                          }
                        >
                          <Text style={styles.link}>Bỏ ảnh</Text>
                        </Pressable>
                      </>
                    ) : (
                      <ActivityIndicator color={colors.primary} />
                    )}
                  </View>
                ))}
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === uid;
            const counts = Object.values(item.reactions ?? {}).reduce<
              Record<string, number>
            >((result, emoji) => {
              result[emoji] = (result[emoji] || 0) + 1;
              return result;
            }, {});
            return (
              <View style={[styles.message, mine && styles.myMessage]}>
                {!mine && info?.type === 'group' && (
                  <Text style={styles.sender}>{nameOf(item.senderId)}</Text>
                )}
                <Pressable
                  delayLongPress={300}
                  onLongPress={() => setSelected(item)}
                  onPress={() => {
                    if (item.recalled) {
                      return;
                    }
                    if (item.type === 'image') {
                      setImage(item.imageUrl!);
                    }
                    if (item.type === 'location') {
                      openLocation(item.lat!, item.lng!).catch(onError);
                    }
                  }}
                  style={[
                    styles.bubble,
                    mine && styles.mine,
                    item.recalled && styles.recalled,
                  ]}
                >
                  {item.recalled ? (
                    <Text style={styles.recalledText}>
                      Tin nhắn đã được thu hồi
                    </Text>
                  ) : (
                    <>
                      {item.replyTo && (
                        <Pressable
                          onPress={() => jump(item.replyTo!.id)}
                          style={styles.quote}
                        >
                          <Text style={styles.sender}>
                            {nameOf(item.replyTo.senderId)}
                          </Text>
                          <Text numberOfLines={2} style={shared.muted}>
                            {messages.find(m => m.id === item.replyTo!.id)
                              ?.recalled
                              ? 'Tin nhắn đã được thu hồi'
                              : item.replyTo.text}
                          </Text>
                        </Pressable>
                      )}
                      {item.type === 'image' ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.photo}
                          accessibilityLabel="Ảnh đã gửi"
                        />
                      ) : (
                        <Text style={shared.body}>
                          {item.type === 'location'
                            ? `📍 Vị trí\n${item.lat?.toFixed(
                                5,
                              )}, ${item.lng?.toFixed(5)}\nNhấn để mở bản đồ`
                            : item.text}
                        </Text>
                      )}
                    </>
                  )}
                  <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                </Pressable>
                {!item.recalled && Object.keys(counts).length > 0 && (
                  <View style={styles.reactions}>
                    {Object.entries(counts).map(([emoji, count]) => (
                      <Pressable
                        key={emoji}
                        onPress={() =>
                          chat
                            .reactToMessage(uid, convId, item.id, emoji)
                            .catch(onError)
                        }
                      >
                        <Text style={styles.reaction}>
                          {emoji}
                          {count > 1 ? ` ${count}` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {item.id === lastMine?.id && (
                  <Text style={styles.receipt}>
                    {readers.length
                      ? `Đã xem${
                          info?.type === 'group'
                            ? ` bởi ${readers.length} người`
                            : ''
                        } · ${new Date(seenTime).toLocaleTimeString('vi-VN')}`
                      : 'Đã gửi'}
                  </Text>
                )}
              </View>
            );
          }}
        />
        {reply && (
          <View style={styles.replyBar}>
            <Text numberOfLines={1} style={styles.flex}>
              Trả lời {nameOf(reply.senderId)}: {chat.preview(reply)}
            </Text>
            <Pressable onPress={() => setReply(undefined)}>
              <Text>✕</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.composer}>
          <Pressable
            disabled={!convId}
            accessibilityLabel="Gửi ảnh"
            onPress={() =>
              Alert.alert('Gửi ảnh', 'Chọn nguồn ảnh', [
                { text: 'Chụp ảnh', onPress: () => choose(true) },
                { text: 'Chọn từ thư viện', onPress: () => choose(false) },
                { text: 'Hủy', style: 'cancel' },
              ])
            }
          >
            <Text style={styles.tool}>📷</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Gửi vị trí"
            disabled={sending}
            onPress={sendLocation}
          >
            <Text style={styles.tool}>📍</Text>
          </Pressable>
          <TextInput
            multiline
            accessibilityLabel="Nhập tin nhắn"
            placeholder="Nhắn gì đó…"
            placeholderTextColor={colors.muted}
            maxLength={2000}
            value={text}
            onChangeText={value => {
              setText(value);
              typer.current?.changed(!!value.trim());
            }}
            style={styles.input}
          />
          <Pressable
            disabled={sending || !text.trim() || !convId}
            accessibilityLabel="Gửi tin nhắn"
            onPress={sendText}
          >
            <Text style={styles.send}>{sending ? '…' : '➤'}</Text>
          </Pressable>
        </View>
        <Modal
          transparent
          visible={!!selected}
          animationType="fade"
          onRequestClose={() => setSelected(undefined)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => setSelected(undefined)}
          >
            <View style={styles.menu}>
              <Text style={styles.menuTitle}>Tương tác tin nhắn</Text>
              {!selected?.recalled && (
                <>
                  <View style={styles.emojiRow}>
                    {chat.REACTIONS.map(emoji => (
                      <Pressable
                        key={emoji}
                        onPress={() =>
                          action(() =>
                            chat.reactToMessage(
                              uid,
                              convId,
                              selected!.id,
                              emoji,
                            ),
                          )
                        }
                      >
                        <Text style={styles.emoji}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    onPress={() =>
                      action(() => Clipboard.setString(chat.preview(selected!)))
                    }
                  >
                    <Text style={styles.menuAction}>Sao chép</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setReply(selected);
                      setSelected(undefined);
                    }}
                  >
                    <Text style={styles.menuAction}>Trả lời</Text>
                  </Pressable>
                  {selected?.senderId === uid && (
                    <Pressable
                      onPress={() =>
                        action(() =>
                          chat.recallMessage(uid, convId, selected!.id),
                        )
                      }
                    >
                      <Text style={[styles.menuAction, styles.error]}>
                        Thu hồi
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
              <Pressable onPress={() => setSelected(undefined)}>
                <Text style={styles.menuAction}>Đóng</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
        <Modal visible={!!image} onRequestClose={() => setImage('')}>
          <SafeAreaView style={styles.fullImage}>
            <Pressable onPress={() => setImage('')}>
              <Text style={styles.close}>✕ Đóng</Text>
            </Pressable>
            <Image
              source={{ uri: image || undefined }}
              resizeMode="contain"
              style={styles.flex}
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function merge(current: Message[], incoming: Message[]) {
  return [
    ...new Map([...current, ...incoming].map(m => [m.id, m])).values(),
  ].sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 38, color: colors.primary },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.green, marginTop: 5 },
  search: {
    margin: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.input,
    color: colors.text,
  },
  searchNote: { paddingHorizontal: 20, color: colors.muted, fontSize: 12 },
  list: { padding: 16 },
  message: { alignItems: 'flex-start', marginVertical: 7, maxWidth: '88%' },
  myMessage: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: {
    backgroundColor: colors.surface,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mine: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  sender: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 5,
  },
  time: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 7,
    alignSelf: 'flex-end',
  },
  photo: { width: 220, height: 180, borderRadius: 12 },
  recalled: { backgroundColor: colors.input },
  recalledText: { fontStyle: 'italic', color: colors.muted },
  receipt: { fontSize: 11, color: colors.muted, marginTop: 6 },
  reactions: { flexDirection: 'row', gap: 5, marginTop: 4 },
  reaction: {
    fontSize: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 5,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
    marginBottom: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.input,
    borderRadius: 18,
    padding: 12,
    color: colors.text,
  },
  tool: { fontSize: 22 },
  send: { fontSize: 26, color: colors.primary },
  error: { color: colors.danger, padding: 10, fontSize: 12 },
  link: { color: colors.primary, fontWeight: '700', padding: 8 },
  pending: { alignSelf: 'flex-end', marginVertical: 8, gap: 8 },
  replyBar: {
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.primaryLight,
  },
  load: { textAlign: 'center', color: colors.muted, padding: 15 },
  overlay: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    padding: 24,
  },
  menu: { backgroundColor: colors.surface, borderRadius: 24, padding: 20 },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  emoji: { fontSize: 28 },
  menuAction: { padding: 16, fontSize: 16, color: colors.primary },
  fullImage: { flex: 1, backgroundColor: '#161219' },
  close: { color: '#fff', fontSize: 18, padding: 22 },
});
