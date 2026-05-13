import React from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/Button';
import { colors, spacing, radius, font } from '../../theme';
import type { DailyChallenge, WikiChallenge } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  challenge: DailyChallenge | WikiChallenge;
  title?: string;
}

function buildEmojiGrid(challenge: DailyChallenge | WikiChallenge): string {
  return challenge.attempts
    .map((a) => (a.correct ? '🟢' : a.skipped ? '⬛' : '🔴'))
    .join('');
}

export function WinModal({ visible, onClose, challenge, title }: Props) {
  const grid = buildEmojiGrid(challenge);
  const isTodayChallenge = !challenge.isPastChallenge;

  React.useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  const handleShare = async () => {
    const type = challenge.mediaType === 'wiki' ? 'WikiGuessr' : 'GuessToday';
    const text = `${type} #${challenge.challengeNumber} - ${challenge.attemptsUsed}/${challenge.maxAttempts}\n${grid}\nguesstoday.fr`;
    await Share.share({ message: text });
  };

  return (
    <BaseModal visible={visible} onClose={onClose} title="Bravo ! 🎉" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.celebration}>
          <Ionicons name="trophy" size={56} color={colors.gold} />
          <Text style={styles.winTitle}>
            {title ?? 'Vous avez trouvé !'}
          </Text>
          <Text style={styles.attemptsText}>
            {challenge.attemptsUsed === 1
              ? 'En seulement 1 tentative !'
              : `En ${challenge.attemptsUsed} tentatives`}
          </Text>
        </View>

        <View style={styles.grid}>
          <Text style={styles.gridText}>{grid}</Text>
        </View>

        <View style={styles.actions}>
          {isTodayChallenge && (
            <Button label="Partager" onPress={handleShare} fullWidth />
          )}
          <Button label="Fermer" variant="secondary" onPress={onClose} fullWidth />
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', gap: spacing.xl },
  celebration: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  winTitle: { fontSize: font.xxl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  attemptsText: { fontSize: font.lg, color: colors.gold },
  grid: { alignItems: 'center', paddingVertical: spacing.lg },
  gridText: { fontSize: 28, letterSpacing: 4 },
  actions: { gap: spacing.sm },
});
