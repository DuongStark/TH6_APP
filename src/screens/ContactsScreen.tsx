import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageCircle } from '../components/Icons';
import Avatar from '../components/Avatar';
import ScreenHeader from '../components/ScreenHeader';
import SearchField from '../components/SearchField';
import EmptyState from '../components/EmptyState';
import ListDivider from '../components/ListDivider';
import { useChat } from '../context/ChatContext';
import { matchesSearch } from '../utils/search';
import { colors, shared } from '../theme';
import type { RootStackParams } from '../types';

export default function ContactsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { contacts, dataLoading } = useChat();
  const [query, setQuery] = useState('');
  const filtered = contacts
    .filter(contact => matchesSearch(contact.name, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScreenHeader
        title="Danh bạ"
        subtitle={`${contacts.length} người bạn · ${
          contacts.filter(contact => contact.online).length
        } đang hoạt động`}
      />
      <SearchField
        value={query}
        onChangeText={setQuery}
        label="Tìm trong danh bạ"
      />
      <View style={styles.section}>
        <Text style={styles.sectionText}>BẠN BÈ</Text>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={contact => contact.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={shared.list}
        ItemSeparatorComponent={ListDivider}
        ListEmptyComponent={
          <EmptyState
            title={
              dataLoading ? 'Đang tải danh bạ…' : 'Không tìm thấy người dùng'
            }
            description="Thử tìm bằng tên có hoặc không dấu."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Nhắn tin với ${item.name}, ${item.lastSeen}`}
            activeOpacity={0.65}
            style={styles.contact}
            onPress={() => {
              navigation.navigate('Chat', { contactId: item.id });
            }}
          >
            <Avatar
              source={item.avatar}
              name={item.name}
              online={item.online}
            />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, item.online && styles.online]}>
                {item.lastSeen}
              </Text>
            </View>
            <View style={styles.messageIcon}>
              <MessageCircle
                size={19}
                color={colors.primary}
                strokeWidth={1.6}
              />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.faint,
  },
  count: { fontSize: 12, color: colors.faint },
  contact: {
    paddingHorizontal: 24,
    paddingVertical: 19,
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
  },
  info: { flex: 1, gap: 7 },
  name: { fontSize: 16, color: colors.text, fontWeight: '600' },
  status: { fontSize: 12, color: colors.muted },
  online: { color: colors.green },
  messageIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
