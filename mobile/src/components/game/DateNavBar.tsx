import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function DateNavBar({ challenge, viewingDate, onPrev, onNext, onToday, isLoading }: Props) {
  const isPast = Boolean(viewingDate);
  const canPrev = challenge.hasPrevChallenge;
  const canNext = challenge.hasNextChallenge;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev || isLoading}
        style={({ pressed }) => [styles.navBtn, (!canPrev || isLoading) && styles.disabled, pressed && styles.pressed]}
        accessibilityLabel="Défi précédent"
      >
        <Ionicons name="chevron-back" size={20} color={canPrev ? colors.text : colors.textMuted} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.dateText}>{formatDate(challenge.date)}</Text>
        <Text style={styles.challengeNum}>Défi #{challenge.challengeNumber}</Text>
        {isPast && (
          <Pressable onPress={onToday} style={styles.todayBtn}>
            <Text style={styles.todayText}>Revenir à aujourd'hui</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onNext}
        disabled={!canNext || isLoading}
        style={({ pressed }) => [styles.navBtn, (!canNext || isLoading) && styles.disabled, pressed && styles.pressed]}
        accessibilityLabel="Défi suivant"
      >
        <Ionicons name="chevron-forward" size={20} color={canNext ? colors.text : colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  navBtn: { padding: spacing.sm },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.6 },
  center: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: font.base, color: colors.text, fontWeight: '500' },
  challengeNum: { fontSize: font.sm, color: colors.textDim, marginTop: 2 },
  todayBtn: { marginTop: spacing.xs },
  todayText: { fontSize: font.sm, color: colors.gold },
});
