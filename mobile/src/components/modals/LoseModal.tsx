import React from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/Button';
import { colors, spacing, radius, font } from '../../theme';
import type { DailyChallenge, WikiChallenge } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  challenge: DailyChallenge | WikiChallenge;
  answer?: string;
  imageUrl?: string;
}

function buildEmojiGrid(challenge: DailyChallenge | WikiChallenge): string {
  return challenge.attempts
    .map((a) => (a.correct ? '🟢' : a.skipped ? '⬛' : '🔴'))
    .join('');
}

export function LoseModal({ visible, onClose, challenge, answer, imageUrl }: Props) {
  const grid = buildEmojiGrid(challenge);

  React.useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [visible]);

  const handleShare = async () => {
    const type = challenge.mediaType === 'wiki' ? 'WikiGuessr' : 'GuessToday';
    const text = `${type} #${challenge.challengeNumber} - ❌\n${grid}\nguesstoday.fr`;
    await Share.share({ message: text });
  };

  return (
    <BaseModal visible={visible} onClose={onClose} title="Perdu…">
      <View style={styles.container}>
        {imageUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons name="sad-outline" size={56} color={colors.textDim} />
          </View>
        )}

        {answer && (
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>La réponse était</Text>
            <Text style={styles.answerText}>{answer}</Text>
          </View>
        )}

        <View style={styles.grid}>
          <Text style={styles.gridText}>{grid}</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Partager" onPress={handleShare} fullWidth />
          <Button label="Fermer" variant="secondary" onPress={onClose} fullWidth />
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  image: StyleSheet.absoluteFillObject,
  iconContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  answerBox: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  answerLabel: { fontSize: font.sm, color: colors.textDim, marginBottom: spacing.xs },
  answerText: { fontSize: font.xl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  grid: { alignItems: 'center' },
  gridText: { fontSize: 28, letterSpacing: 4 },
  actions: { gap: spacing.sm },
});
