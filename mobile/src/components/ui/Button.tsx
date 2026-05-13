import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type PressableProps,
} from 'react-native';
import { colors, radius, spacing, font } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, variant = 'primary', loading, fullWidth, style, ...rest }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        rest.disabled && styles.disabled,
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.bg : colors.gold} />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}` as keyof typeof styles]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },

  primary: { backgroundColor: colors.gold },
  secondary: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.red },

  label: { fontWeight: '600', fontSize: font.md },
  label_primary: { color: colors.bg },
  label_secondary: { color: colors.text },
  label_ghost: { color: colors.gold },
  label_danger: { color: colors.white },
});
