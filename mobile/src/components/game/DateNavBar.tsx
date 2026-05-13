import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Svg, Rect, Path } from 'react-native-svg';
import { colors, spacing, font } from '../../theme';
import type { DailyChallenge } from '../../types';

interface Props {
  challenge: DailyChallenge;
  viewingDate: string | null;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isLoading: boolean;
}

function CalendarIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={colors.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={colors.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronLeft({ disabled }: { disabled: boolean }) {
  const c = disabled ? colors.textFaint : colors.text;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ disabled }: { disabled: boolean }) {
  const c = disabled ? colors.textFaint : colors.text;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DateNavBar({ challenge, viewingDate, onPrev, onNext, onToday, isLoading }: Props) {
  const isPast = Boolean(viewingDate);
  const canPrev = challenge.hasPrevChallenge;
  const canNext = challenge.hasNextChallenge;

  const dateLabel = isPast
    ? new Date(challenge.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : "Aujourd'hui";

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev || isLoading}
        style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        accessibilityLabel="Défi précédent"
      >
        <ChevronLeft disabled={!canPrev || isLoading} />
      </Pressable>

      <Pressable onPress={isPast ? onToday : undefined} style={styles.center}>
        <View style={styles.dateRow}>
          <CalendarIcon />
          <Text style={[styles.dateText, isPast && styles.dateTextPast]}>{dateLabel}</Text>
        </View>
        {isPast && <Text style={styles.returnToday}>Revenir à aujourd'hui</Text>}
      </Pressable>

      <Pressable
        onPress={onNext}
        disabled={!canNext || isLoading}
        style={({ pressed }) => [styles.navBtn, pressed && styles.pressed, !canNext && styles.dimmed]}
        accessibilityLabel="Défi suivant"
      >
        <ChevronRight disabled={!canNext || isLoading} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  navBtn: { padding: spacing.sm },
  pressed: { opacity: 0.6 },
  dimmed: { opacity: 0.3 },
  center: { flex: 1, alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: colors.gold, fontWeight: '500', fontSize: 13 },
  dateTextPast: { color: colors.textDim },
  returnToday: { fontSize: font.sm, color: colors.gold, marginTop: 2 },
});
