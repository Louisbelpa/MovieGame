import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing, radius, font } from '../../theme';
import type { Hint, WikiChallenge } from '../../types';

interface Props {
  challenge: WikiChallenge;
}

const WIKI_HINT_LABELS: Record<string, string> = {
  wiki_birth_year: 'Année de naissance',
  wiki_nationality: 'Nationalité',
  wiki_domain: 'Domaine',
  wiki_party: 'Parti politique',
  wiki_sport: 'Sport',
  wiki_clubs: 'Clubs',
  wiki_roles: 'Fonctions',
  wiki_notable_works: 'Œuvres notables',
  wiki_era: 'Époque',
  wiki_highlights: 'Points clés',
};

const PERSON_TYPE_LABELS: Record<string, string> = {
  politician: 'Personnalité politique',
  sportsperson: 'Sportif/ve',
  artist: 'Artiste',
  scientist: 'Scientifique',
  entrepreneur: 'Entrepreneur/se',
  writer: 'Auteur/trice',
  historical_figure: 'Personnage historique',
  generic: 'Personnalité',
};

function formatHintValue(hint: Hint): string {
  if (Array.isArray(hint.value)) return hint.value.join(', ');
  return String(hint.value);
}

interface HintCardProps {
  hint: Hint;
  index: number;
}

function WikiHintCard({ hint, index }: HintCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const label = WIKI_HINT_LABELS[hint.type] ?? hint.type.replace('wiki_', '');

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.cardHeader}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path d="M9 21h6M12 3a7 7 0 0 1 7 7c0 3-1.8 5.5-4 6.5V18H9v-1.5C6.8 15.5 5 13 5 10a7 7 0 0 1 7-7z" stroke={colors.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={styles.cardValue}>{formatHintValue(hint)}</Text>
    </Animated.View>
  );
}

export function WikiHintPanel({ challenge }: Props) {
  const visible = challenge.hints.slice(0, challenge.hintsRevealed);
  const locked = challenge.maxAttempts - 1 - challenge.hintsRevealed;
  const typeLabel = PERSON_TYPE_LABELS[challenge.personType] ?? challenge.personType;

  return (
    <View style={styles.container}>
      <View style={styles.typeBadge}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={colors.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="7" r="4" stroke={colors.gold} strokeWidth="1.8" />
        </Svg>
        <Text style={styles.typeText}>{typeLabel}</Text>
      </View>

      {visible.map((hint, i) => (
        <WikiHintCard key={hint.type} hint={hint} index={i} />
      ))}

      {locked > 0 &&
        Array.from({ length: Math.min(locked, 3) }).map((_, i) => (
          <View key={`locked-${i}`} style={styles.lockedSlot}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke={colors.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={colors.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.lockedText}>Indice à venir</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#1a1400',
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2a2200',
  },
  typeText: { fontSize: font.sm, color: colors.gold, fontWeight: '600' },
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
