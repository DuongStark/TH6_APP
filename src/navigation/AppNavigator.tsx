import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Bell, MessageCircle, Settings, UsersRound } from '../components/Icons';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { CreateGroupScreen } from '../screens/CreateGroupScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { useChat } from '../context/ChatContext';
import { colors } from '../theme';
import type { RootStackParams, TabParams } from '../types';

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};
const icons = {
  Home: MessageCircle,
  Contacts: UsersRound,
  Notifications: Bell,
  Settings,
};

function renderTabIcon(name: keyof TabParams, color: string, focused: boolean) {
  const Icon = icons[name];
  return <Icon color={color} size={22} strokeWidth={focused ? 2 : 1.6} />;
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { conversations, notifications } = useChat();
  const unreadMessages = conversations.reduce(
    (total, chat) => total + chat.unread,
    0,
  );
  const unreadNotifications = notifications.filter(
    notice => !notice.read,
  ).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarBadgeStyle: styles.badge,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused }) =>
          renderTabIcon(route.name, color, focused),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Tin nhắn',
          tabBarAccessibilityLabel: 'Tin nhắn, tab',
          tabBarBadge: unreadMessages || undefined,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ title: 'Danh bạ', tabBarAccessibilityLabel: 'Danh bạ, tab' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarAccessibilityLabel: 'Thông báo, tab',
          tabBarBadge: unreadNotifications ? unreadNotifications : undefined,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt', tabBarAccessibilityLabel: 'Cài đặt, tab' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { username, loading, error } = useChat();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text>Đang khôi phục phiên đăng nhập…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {username ? (
            <Stack.Group navigationKey="signed-in">
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group navigationKey="signed-out">
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.surface,
    padding: 14,
    paddingTop: 40,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', marginTop: 5 },
  badge: {
    backgroundColor: colors.primary,
    fontSize: 9,
    minWidth: 16,
    height: 16,
    lineHeight: 16,
  },
});
