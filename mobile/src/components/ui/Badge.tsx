import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, font } from '../../theme';

type Color = 'gold' | 'green' | 'red' | 'dim';

interface Props {
  label: string;
  color?: Color;
}

export function Badge({ label, color = 'dim' }: Props) {
  return (
    <View style={[styles.base, styles[color]]}>
      <Text style={[styles.text, styles[`text_${color}` as keyof typeof styles]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  gold: { backgroundColor: '#2a2200' },
  green: { backgroundColor: '#0d2b1a' },
  red: { backgroundColor: '#2b0d0d' },
  dim: { backgroundColor: colors.surface2 },

  text: { fontSize: font.sm, fontWeight: '600' },
  text_gold: { color: colors.gold },
  text_green: { color: colors.green },
  text_red: { color: colors.red },
  text_dim: { color: colors.textDim },
});
