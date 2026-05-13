import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, font } from '../../theme';
import type { Hint } from '../../types';

interface Props {
  hints: Hint[];
  hintsRevealed: number;
  maxAttempts: number;
}

const HINT_LABELS: Record<string, string> = {
  year: 'Année',
  genre: 'Genre',
  director: 'Réalisateur',
  creator: 'Créateur',
  actor: 'Acteur',
  synopsis: 'Synopsis',
  country: 'Pays',
};

function formatHintValue(hint: Hint): string {
  if (Array.isArray(hint.value)) return hint.value.join(', ');
  return String(hint.value);
}

interface HintCardProps {
  hint: Hint;
  index: number;
}

function HintCard({ hint, index }: HintCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="bulb-outline" size={14} color={colors.gold} />
        <Text style={styles.cardLabel}>{HINT_LABELS[hint.type] ?? hint.type}</Text>
      </View>
      <Text style={styles.cardValue}>{formatHintValue(hint)}</Text>
    </Animated.View>
  );
}

export function HintPanel({ hints, hintsRevealed, maxAttempts }: Props) {
  const visible = hints.slice(0, hintsRevealed);
  const locked = maxAttempts - 1 - hintsRevealed;

  return (
    <View style={styles.container}>
      {visible.map((hint, i) => (
        <HintCard key={hint.type} hint={hint} index={i} />
      ))}
      {locked > 0 && Array.from({ length: Math.min(locked, 3) }).map((_, i) => (
        <View key={`locked-${i}`} style={styles.lockedSlot}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
          <Text style={styles.lockedText}>Indice à venir</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#2a2200',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  cardLabel: { fontSize: font.sm, color: colors.gold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: font.md, color: colors.text, fontWeight: '500' },
  lockedSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  lockedText: { fontSize: font.sm, color: colors.textMuted },
});
