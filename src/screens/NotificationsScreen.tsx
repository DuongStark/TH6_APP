import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParams, ChatNotification } from '../types';
import { useChat } from '../context/ChatContext';
import { colors, shared } from '../theme';
export function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllNotificationsRead } =
    useChat();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const fail = (error: Error) =>
    Alert.alert('Không cập nhật được thông báo', error.message);
  async function open(item: ChatNotification) {
    try {
      await markNotificationRead(item.id);
      navigation.navigate('Chat', { convId: item.convId });
    } catch (error) {
      fail(error as Error);
    }
  }
  return (
    <View style={shared.screen}>
      <View style={styles.header}>
        <Text style={shared.title}>Thông báo</Text>
        <Pressable onPress={() => markAllNotificationsRead().catch(fail)}>
          <Text style={styles.link}>Đánh dấu tất cả đã đọc</Text>
        </Pressable>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Bạn chưa có thông báo.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            style={[styles.row, !item.read && styles.unread]}
          >
            <Text style={styles.icon}>
              {item.type === 'group'
                ? '👥'
                : item.type === 'reaction'
                ? '❤️'
                : '💬'}
            </Text>
            <View style={styles.body}>
              <Text style={shared.body}>{item.text}</Text>
              <Text style={shared.muted}>
                {new Date(item.createdAt).toLocaleString('vi-VN')}
              </Text>
            </View>
            {!item.read && <Text style={styles.link}>●</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  header: { padding: 24, paddingTop: 56, gap: 16 },
  link: { color: colors.primary, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    padding: 20,
    gap: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: { backgroundColor: colors.primaryLight },
  body: { flex: 1, gap: 8 },
  icon: { fontSize: 26 },
  empty: { padding: 24, color: colors.muted },
});
