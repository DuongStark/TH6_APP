import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParams } from '../types';
import { colors, fonts } from '../theme';
import { errorMessage, register } from '../services/auth';
import { validateRegistration } from '../utils/chat';

type Props = NativeStackScreenProps<RootStackParams, 'Register'>;
export default function RegisterScreen({ navigation }: Props) {
  // Bốn state tương ứng bốn ô nhập. Không lưu mật khẩu vào database của app.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) {
      return;
    }
    const validation = validateRegistration(
      name,
      email,
      password,
      confirmation,
    );
    setError(validation);
    if (validation) {
      return;
    }
    setBusy(true);
    try {
      await register(name, email, password, confirmation);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>mây</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Tạo tài khoản
          </Text>
          <Text style={styles.subtitle}>Một lời chào, một kết nối mới.</Text>
          <Text style={styles.label}>Họ tên</Text>
          <TextInput
            placeholderTextColor={colors.faint}
            accessibilityLabel="Họ tên"
            placeholder="Nhập họ và tên"
            value={name}
            onChangeText={setName}
            maxLength={80}
            autoComplete="name"
            style={styles.input}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholderTextColor={colors.faint}
            accessibilityLabel="Email đăng ký"
            placeholder="ban@example.com"
            value={email}
            onChangeText={setEmail}
            maxLength={254}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={styles.input}
          />
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            placeholderTextColor={colors.faint}
            accessibilityLabel="Mật khẩu đăng ký"
            placeholder="Ít nhất 6 ký tự"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            maxLength={128}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            style={styles.input}
          />
          <Text style={styles.label}>Nhập lại mật khẩu</Text>
          <TextInput
            placeholderTextColor={colors.faint}
            accessibilityLabel="Nhập lại mật khẩu"
            placeholder="Nhập lại mật khẩu"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry={!showPassword}
            maxLength={128}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
            style={styles.input}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onPress={() => setShowPassword(value => !value)}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            </Text>
          </TouchableOpacity>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Đăng ký"
            disabled={busy}
            onPress={submit}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Đang tạo tài khoản…' : 'Đăng ký'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Về đăng nhập"
            onPress={() => navigation.goBack()}
            style={styles.link}
            disabled={busy}
          >
            <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
          </TouchableOpacity>
          <View style={styles.bottom} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  brand: {
    fontFamily: fonts.display,
    fontSize: 43,
    color: colors.primary,
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 20,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 9,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 15,
    minHeight: 54,
    color: colors.text,
    fontSize: 15,
  },
  link: { paddingVertical: 17, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: 14, lineHeight: 21 },
  button: {
    backgroundColor: colors.primary,
    minHeight: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  bottom: { height: 8 },
});
