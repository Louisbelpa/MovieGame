import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Svg, Rect, Path } from 'react-native-svg';
import { colors, font } from '../../theme';
import type { Hint } from '../../types';

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

function LockIcon() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="11" width="16" height="10" rx="2" stroke={colors.textFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={colors.textFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HintChip({ hint, index }: { hint: Hint; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, delay: index * 60 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, delay: index * 60, friction: 7 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.chip, styles.chipRevealed, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.chipLabel}>{HINT_LABELS[hint.type] ?? hint.type}</Text>
      <Text style={styles.chipValue}>{formatHintValue(hint)}</Text>
    </Animated.View>
  );
}

function LockedChip() {
  return (
    <View style={[styles.chip, styles.chipLocked]}>
      <LockIcon />
      <Text style={styles.chipLockedText}>???</Text>
    </View>
  );
}

export function HintPanel({ hints, hintsRevealed, maxAttempts }: {
  hints: Hint[];
  hintsRevealed: number;
  maxAttempts: number;
}) {
  const visible = hints.slice(0, hintsRevealed);
  const totalSlots = Math.min(hints.length, 3);
  const lockedCount = Math.max(0, totalSlots - visible.length);

  return (
    <View>
      <Text style={styles.sectionLabel}>
        Indices ({visible.length}/{totalSlots})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {visible.map((h, i) => (
          <HintChip key={h.type} hint={h} index={i} />
        ))}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <LockedChip key={`locked-${i}`} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'column',
    gap: 3,
    minWidth: 90,
  },
  chipRevealed: {
    backgroundColor: colors.surface2,
    // Subtle top highlight
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  chipLocked: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.gold,
  },
  chipValue: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.text,
  },
  chipLockedText: {
    fontSize: 12,
    color: colors.textFaint,
    letterSpacing: 2,
  },
});
