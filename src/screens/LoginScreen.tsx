import React, { useRef, useState } from 'react';
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
import {
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
} from '../components/Icons';
import Avatar from '../components/Avatar';

import { useChat } from '../context/ChatContext';
import { colors, fonts } from '../theme';
import { errorMessage } from '../services/auth';
import { usingEmulators } from '../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParams } from '../types';

export default function LoginScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, 'Login'>) {
  const { signIn } = useChat();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const passwordInput = useRef<React.ComponentRef<typeof TextInput>>(null);
  const usernameError = submitted && !username.trim();
  const passwordError = submitted && !password;

  async function submit() {
    if (busy) {
      return;
    }
    setSubmitted(true);
    setError('');
    if (!username.trim() || !password) {
      return;
    }
    setBusy(true);
    try {
      await signIn(username, password);
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Cloud color={colors.primary} size={32} strokeWidth={1.5} />
            <Text style={styles.brandText}>mây</Text>
          </View>
          <View
            style={styles.illustration}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View style={styles.circle} />
            <View style={styles.preview}>
              <Avatar name="Mây" size={39} />
              <View>
                <Text style={styles.previewName}>Bảo Ngọc</Text>
                <Text style={styles.previewMessage}>
                  Chiều đi cà phê nhé ☕
                </Text>
              </View>
              <Text style={styles.previewTime}>09:41</Text>
            </View>
            <View style={styles.reply}>
              <Text style={styles.replyText}>Được chứ, hẹn bạn!</Text>
              <Text style={styles.replyTime}>09:42</Text>
            </View>
            <View style={styles.tinyDot} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Đăng nhập
          </Text>
          <Text style={styles.subtitle}>Cuộc trò chuyện đang chờ bạn.</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.field, usernameError && styles.fieldError]}>
              <UserRound size={19} color={colors.muted} strokeWidth={1.7} />
              <TextInput
                accessibilityLabel="Email"
                placeholder="Email của bạn"
                placeholderTextColor={colors.faint}
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInput.current?.focus()}
              />
            </View>
            {usernameError && (
              <Text accessibilityRole="alert" style={styles.error}>
                Vui lòng nhập email.
              </Text>
            )}
            <Text style={[styles.label, styles.passwordLabel]}>Mật khẩu</Text>
            <View style={[styles.field, passwordError && styles.fieldError]}>
              <LockKeyhole size={19} color={colors.muted} strokeWidth={1.7} />
              <TextInput
                ref={passwordInput}
                accessibilityLabel="Mật khẩu"
                placeholder="Nhập mật khẩu"
                placeholderTextColor={colors.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
                maxLength={128}
                returnKeyType="go"
                onSubmitEditing={submit}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                }
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eye}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.muted} />
                ) : (
                  <Eye size={20} color={colors.muted} />
                )}
              </TouchableOpacity>
            </View>
            {passwordError && (
              <Text accessibilityRole="alert" style={styles.error}>
                Vui lòng nhập mật khẩu.
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đăng nhập"
              onPress={submit}
              disabled={busy}
              style={styles.button}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Text>
              <ArrowRight size={21} color={colors.surface} />
            </TouchableOpacity>
          </View>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tạo tài khoản"
            onPress={() => navigation.navigate('Register')}
            style={styles.register}
          >
            <Text style={styles.registerText}>Chưa có tài khoản? Đăng ký</Text>
          </TouchableOpacity>
          {usingEmulators && (
            <Text style={styles.demo}>
              Firebase Emulator · Khởi chạy emulator trước khi đăng nhập.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 26,
    justifyContent: 'center',
  },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  brandText: {
    fontFamily: fonts.display,
    fontSize: 43,
    color: colors.primary,
    letterSpacing: -2,
  },
  illustration: {
    height: 196,
    justifyContent: 'center',
    marginTop: 26,
    marginBottom: 28,
  },
  circle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F0E8E5',
    alignSelf: 'center',
  },
  preview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginRight: 18,
    transform: [{ rotate: '-4deg' }],
  },
  previewName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
  },
  previewMessage: { fontSize: 12, color: colors.muted },
  previewTime: {
    fontSize: 10,
    color: colors.faint,
    position: 'absolute',
    right: 16,
    top: 18,
  },
  reply: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: 19,
    paddingVertical: 14,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    marginTop: 17,
    marginRight: 5,
    transform: [{ rotate: '3deg' }],
  },
  replyText: { color: colors.surface, fontSize: 13, fontWeight: '500' },
  replyTime: {
    color: '#DDC8D1',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 6,
  },
  tinyDot: {
    width: 9,
    height: 9,
    backgroundColor: colors.green,
    borderRadius: 5,
    position: 'absolute',
    bottom: 16,
    left: 35,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1.1,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 30,
  },
  form: { width: '100%' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 9,
  },
  passwordLabel: { marginTop: 20 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    minHeight: 55,
  },
  fieldError: { borderColor: colors.danger },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.text,
  },
  eye: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 12, color: colors.danger, marginTop: 7 },
  button: {
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 28,
  },
  buttonText: { fontSize: 15, color: colors.surface, fontWeight: '600' },
  register: { padding: 16, marginTop: 10, alignItems: 'center' },
  registerText: { color: colors.primary, fontWeight: '600' },
  demo: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 27,
  },
});
