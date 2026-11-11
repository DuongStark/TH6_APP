import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CircleUserRound, LogOut, Radio } from '../components/Icons';
import Avatar from '../components/Avatar';
import ScreenHeader from '../components/ScreenHeader';
import { useChat } from '../context/ChatContext';
import { colors, shared } from '../theme';
import { errorMessage } from '../services/auth';

export default function SettingsScreen() {
  const {
    username,
    email,
    showOnline,
    notificationsEnabled,
    setShowOnline,
    setNotificationsEnabled,
    signOut,
  } = useChat();

  const [busy, setBusy] = useState(false);
  async function handleLogout() {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Không thể đăng xuất', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Cài đặt"
          subtitle="Tài khoản và tùy chọn của bạn"
        />
        <View style={styles.profile}>
          <Avatar name={username ?? 'M'} size={80} online={showOnline} />
          <Text style={styles.profileName}>{username}</Text>
          <Text style={styles.handle}>{email}</Text>
          <View style={[styles.statusPill, !showOnline && styles.hiddenPill]}>
            <View style={[styles.statusDot, !showOnline && styles.hiddenDot]} />
            <Text style={[styles.statusText, !showOnline && styles.hiddenText]}>
              {showOnline ? 'Đang hoạt động' : 'Đang ẩn trạng thái'}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>TÀI KHOẢN</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.icon}>
              <CircleUserRound
                size={20}
                color={colors.primary}
                strokeWidth={1.6}
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Tên tài khoản</Text>
              <Text style={styles.settingDescription}>{username}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.sectionLabel}>TÙY CHỌN</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.icon}>
              <Radio size={20} color={colors.primary} strokeWidth={1.6} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Trạng thái hoạt động</Text>
              <Text style={styles.settingDescription}>
                Hiện trạng thái trên ảnh đại diện
              </Text>
            </View>
            <Switch
              accessibilityLabel="Hiển thị trạng thái hoạt động"
              value={showOnline}
              onValueChange={setShowOnline}
              trackColor={{ false: '#D9D6D3', true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor="#D9D6D3"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.icon}>
              <Bell size={20} color={colors.primary} strokeWidth={1.6} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dấu nhắc thông báo</Text>
              <Text style={styles.settingDescription}>
                Hiện số chưa đọc trên tab Thông báo
              </Text>
            </View>
            <Switch
              accessibilityLabel="Hiển thị dấu nhắc thông báo"
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D9D6D3', true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor="#D9D6D3"
            />
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
          onPress={handleLogout}
          disabled={busy}
          style={styles.logout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={colors.danger} strokeWidth={1.7} />
          <Text style={styles.logoutText}>
            {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.version}>mây · Bài thực hành 5</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  profile: { alignItems: 'center', paddingTop: 6, paddingBottom: 30 },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 18,
  },
  handle: { fontSize: 13, color: colors.muted, marginTop: 5 },
  statusPill: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: { fontSize: 11, color: colors.green, fontWeight: '500' },
  hiddenPill: { backgroundColor: colors.input },
  hiddenDot: { backgroundColor: colors.muted },
  hiddenText: { color: colors.muted },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '700',
    color: colors.faint,
    marginHorizontal: 26,
    marginBottom: 12,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 25,
  },
  settingRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 18,
    alignItems: 'center',
  },
  icon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1, gap: 6 },
  settingTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  settingDescription: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  divider: { height: 1, marginLeft: 62, backgroundColor: colors.border },
  logout: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#F8EBED',
    borderWidth: 1,
    borderColor: '#F0DCDF',
  },
  logoutText: { fontSize: 14, color: colors.danger, fontWeight: '600' },
  version: {
    fontSize: 11,
    color: colors.faint,
    textAlign: 'center',
    marginTop: 26,
  },
});
