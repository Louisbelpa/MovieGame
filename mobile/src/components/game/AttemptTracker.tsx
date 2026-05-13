import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import type { GuessEntry } from '../../types';

interface Props {
  attempts: GuessEntry[];
  maxAttempts: number;
  accentColor?: string;
  accentSoft?: string;
}

export function AttemptTracker({
  attempts,
  maxAttempts,
  accentColor = colors.films,
  accentSoft = colors.filmsSoft,
}: Props) {
  const slots = Array.from({ length: maxAttempts }, (_, i) => attempts[i] ?? null);
  const current = attempts.length;

  return (
    <View style={styles.row} accessibilityLabel={`${attempts.length} sur ${maxAttempts} tentatives utilisées`}>
      {slots.map((attempt, i) => {
        const isCorrect = attempt?.correct;
        const isWrong = attempt && !attempt.correct;
        const isCurrent = !attempt && i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isCorrect && styles.dotCorrect,
              isWrong && styles.dotWrong,
              isCurrent && { backgroundColor: accentColor },
              !attempt && !isCurrent && styles.dotEmpty,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  dotEmpty: {
    backgroundColor: colors.borderStrong,
  },
  dotCorrect: {
    backgroundColor: colors.green,
  },
  dotWrong: {
    backgroundColor: colors.red,
  },
});
