import {SafeAreaView} from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParams } from '../types';
import { useChat } from '../context/ChatContext';
import { createGroup } from '../services/groupService';
import { colors, shared } from '../theme';
export function CreateGroupScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, 'CreateGroup'>) {
  const { uid, contacts } = useChat();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const convId = await createGroup(uid, name, selected);
      navigation.replace('Chat', { convId });
    } catch (error) {
      Alert.alert('Không tạo được nhóm', (error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={shared.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>‹ Quay lại</Text>
        </Pressable>
        <Text style={shared.title}>Tạo nhóm</Text>
      </View>
      <TextInput
        accessibilityLabel="Tên nhóm"
        placeholder="Tên nhóm"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
        maxLength={80}
        style={styles.input}
      />
      <Text style={styles.hint}>
        Chọn tối thiểu 2 người ngoài bản thân · Đã chọn {selected.length}
      </Text>
      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.hint}>
            Chưa có liên hệ. Đăng ký thêm tài khoản để tạo nhóm.
          </Text>
        }
        renderItem={({ item }) => {
          const checked = selected.includes(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() =>
                setSelected(current =>
                  checked
                    ? current.filter(id => id !== item.id)
                    : [...current, item.id],
                )
              }
              style={styles.row}
            >
              <Text style={styles.check}>{checked ? '☑' : '☐'}</Text>
              <Text style={shared.body}>{item.name}</Text>
              <Text style={shared.muted}>{item.online ? '●' : ''}</Text>
            </Pressable>
          );
        }}
      />
      <Pressable
        disabled={busy || selected.length < 2 || !name.trim()}
        onPress={create}
        style={[
          styles.button,
          (busy || selected.length < 2 || !name.trim()) && styles.disabled,
        ]}
      >
        <Text style={styles.white}>{busy ? 'Đang tạo…' : 'Tạo nhóm'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: { padding: 24, gap: 18 },
  link: { color: colors.primary, fontSize: 17 },
  input: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.input,
    padding: 16,
    color: colors.text,
  },
  hint: { padding: 24, color: colors.muted },
  row: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  check: { fontSize: 26, color: colors.primary },
  button: {
    margin: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  white: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
