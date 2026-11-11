import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { colors } from '../theme';

type Props = {
  source?: ImageSourcePropType;
  name?: string;
  size?: number;
  online?: boolean;
};

export default function Avatar({
  source,
  name = 'M',
  size = 54,
  online = false,
}: Props) {
  return (
    <View style={{ width: size, height: size }}>
      {source ? (
        <Image
          source={source}
          accessibilityLabel={`Ảnh đại diện ${name}`}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.initial,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.letter, { fontSize: size * 0.4 }]}>
            {name.trim().charAt(0).toLocaleUpperCase('vi')}
          </Text>
        </View>
      )}
      {online && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.input },
  initial: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: colors.primary, fontWeight: '600' },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: colors.background,
  },
});
