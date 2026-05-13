import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../theme';
import type { GuessEntry } from '../../types';

interface Props {
  attempts: GuessEntry[];
  maxAttempts: number;
}

export function AttemptTracker({ attempts, maxAttempts }: Props) {
  const slots = Array.from({ length: maxAttempts }, (_, i) => attempts[i] ?? null);

  return (
    <View style={styles.row} accessibilityLabel={`${attempts.length} sur ${maxAttempts} tentatives utilisées`}>
      {slots.map((attempt, i) => (
        <View
          key={i}
          style={[
            styles.slot,
            attempt?.correct && styles.slotCorrect,
            attempt && !attempt.correct && styles.slotWrong,
            !attempt && styles.slotEmpty,
          ]}
        >
          {attempt?.correct && <Ionicons name="checkmark" size={14} color={colors.bg} />}
          {attempt && !attempt.correct && (
            <Ionicons
              name={attempt.skipped ? 'remove' : 'close'}
              size={14}
              color={colors.white}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  slot: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  slotEmpty: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotCorrect: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  slotWrong: {
    borderColor: colors.red,
    backgroundColor: colors.red,
  },
});
