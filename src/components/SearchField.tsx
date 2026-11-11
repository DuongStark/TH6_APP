import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from './Icons';
import { colors } from '../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
};

export default function SearchField({ value, onChangeText, label }: Props) {
  return (
    <View style={styles.container}>
      <Search size={19} color={colors.muted} strokeWidth={1.8} />
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
        maxLength={100}
      />
      {!!value && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Xóa tìm kiếm"
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <X size={18} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    marginHorizontal: 24,
    paddingLeft: 16,
    borderRadius: 15,
    minHeight: 50,
    marginBottom: 22,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 13,
    paddingHorizontal: 11,
    color: colors.text,
  },
  clear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
