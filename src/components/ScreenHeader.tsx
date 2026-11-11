import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cloud } from './Icons';
import { colors, shared } from '../theme';

type Props = { title: string; subtitle?: string; action?: React.ReactNode };

export default function ScreenHeader({ title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Cloud color={colors.primary} size={20} strokeWidth={1.7} />
        <Text style={styles.brandName}>mây</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={shared.title}>
            {title}
          </Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: { flex: 1 },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.muted, marginTop: 7 },
});
