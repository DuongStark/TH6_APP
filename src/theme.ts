import { Platform, StyleSheet } from 'react-native';

export const colors = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  text: '#27242A',
  muted: '#76717B',
  faint: '#A19AA3',
  primary: '#713C52',
  primaryLight: '#F2E8EC',
  border: '#ECE9E5',
  green: '#39866A',
  greenLight: '#EAF3ED',
  danger: '#AA4054',
  input: '#F0EEEB',
};

export const fonts = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }),
};

export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.text,
  },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 98,
    marginRight: 24,
  },
  list: { paddingBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.surface },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
