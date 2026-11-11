import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParams } from '../types';
import { useChat } from '../context/ChatContext';
import Avatar from '../components/Avatar';
import { colors, shared } from '../theme';
import { formatTime } from '../utils/chat';
export function HomeScreen() {
  const { contacts, conversations, dataLoading } = useChat();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const rows = conversations
    .map(chat => {
      const person = contacts.find(c => c.id === chat.contactId);
      return {
        ...chat,
        person,
        name:
          chat.info?.type === 'group'
            ? chat.info.name
            : person?.name ?? 'Người dùng',
      };
    })
    .filter(
      chat =>
        chat.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
        (!unreadOnly || chat.unread > 0),
    );
  return (
    <View style={shared.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MÂY TH5+</Text>
          <Text style={shared.title}>Tin nhắn</Text>
        </View>
        <Pressable
          accessibilityLabel="Tạo nhóm"
          onPress={() => navigation.navigate('CreateGroup')}
          style={styles.newGroup}
        >
          <Text style={styles.link}>＋ Nhóm</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Tìm cuộc trò chuyện"
        placeholder="Tìm cuộc trò chuyện…"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <View style={styles.filters}>
        {[false, true].map(value => (
          <Pressable
            key={String(value)}
            onPress={() => setUnreadOnly(value)}
            style={[styles.filter, unreadOnly === value && styles.selected]}
          >
            <Text style={styles.link}>{value ? 'Chưa đọc' : 'Tất cả'}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={item => item.id!}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {dataLoading
              ? 'Đang tải cuộc trò chuyện…'
              : 'Chưa có cuộc trò chuyện. Mở Danh bạ để nhắn tin hoặc tạo nhóm mới.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Chat', { convId: item.id })}
            style={styles.row}
          >
            {item.info?.type === 'group' ? (
              <View style={styles.groupAvatar}>
                <Text style={styles.groupIcon}>👥</Text>
              </View>
            ) : (
              <Avatar
                name={item.name}
                source={item.person?.avatar}
                online={item.person?.online}
              />
            )}
            <View style={styles.content}>
              <Text style={[styles.name, item.unread > 0 && styles.bold]}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={shared.muted}>
                {item.lastMessage || 'Bắt đầu cuộc trò chuyện'}
              </Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
              {item.unread > 0 && (
                <View style={shared.badge}>
                  <Text style={shared.badgeText}>{item.unread}</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
      <Pressable
        accessibilityLabel="Tin nhắn mới"
        onPress={() => navigation.navigate('Main', { screen: 'Contacts' })}
        style={styles.compose}
      >
        <Text style={styles.white}>＋</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    padding: 24,
    paddingTop: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: colors.primary,
    letterSpacing: 3,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
  },
  newGroup: {
    padding: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
  },
  link: { color: colors.primary, fontWeight: '600' },
  search: {
    marginHorizontal: 24,
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.input,
    color: colors.text,
  },
  filters: { flexDirection: 'row', gap: 10, padding: 20 },
  filter: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  selected: { backgroundColor: colors.primaryLight },
  row: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { flex: 1, gap: 8 },
  name: { fontSize: 16, color: colors.text },
  bold: { fontWeight: '700' },
  meta: { gap: 10, alignItems: 'flex-end' },
  time: { fontSize: 11, color: colors.muted },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIcon: { fontSize: 25 },
  empty: { padding: 24, color: colors.muted, lineHeight: 24 },
  compose: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  white: { color: '#fff', fontSize: 30 },
});
