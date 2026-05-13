import React from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Svg, Path, Circle, Polyline } from 'react-native-svg';
import { Image } from 'expo-image';
import { BaseModal } from './BaseModal';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, radius, font, accentFor } from '../../theme';
import type { DailyChallenge, WikiChallenge } from '../../types';

function SadIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={colors.textDim} strokeWidth="1.6" />
      <Path d="M8 15s1.5-2 4-2 4 2 4 2" stroke={colors.textDim} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M9 9h.01M15 9h.01" stroke={colors.textDim} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ShareIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="16 6 12 2 8 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 2v13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function buildEmojiGrid(challenge: DailyChallenge | WikiChallenge): string {
  return challenge.attempts
    .map((a) => (a.correct ? '🟢' : a.skipped ? '⬛' : '🔴'))
    .join('');
}

interface Props {
  visible: boolean;
  onClose: () => void;
  challenge: DailyChallenge | WikiChallenge;
  answer?: string;
  imageUrl?: string;
}

export function LoseModal({ visible, onClose, challenge, answer, imageUrl }: Props) {
  const grid = buildEmojiGrid(challenge);
  const accent = accentFor(challenge.mediaType as any);

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
        {/* Image ou icône */}
        {imageUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
          </View>
        ) : (
          <GlassView style={styles.iconCard} intensity={30} specular={false}>
            <SadIcon />
          </GlassView>
        )}

        {/* Réponse */}
        {answer && (
          <GlassView style={styles.answerCard} intensity={30} specular={false}>
            <Text style={styles.answerLabel}>La réponse était</Text>
            <Text style={[styles.answerText, { color: accent.color }]}>{answer}</Text>
          </GlassView>
        )}

        {/* Dot grid */}
        <View style={styles.gridSection}>
          <Text style={styles.gridLabel}>Votre partie</Text>
          <View style={styles.gridRow}>
            {challenge.attempts.map((a, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  a.correct
                    ? { backgroundColor: colors.green }
                    : a.skipped
                    ? { backgroundColor: colors.textFaint }
                    : { backgroundColor: colors.red },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.8 }]}
          >
            <ShareIcon />
            <Text style={styles.shareBtnLabel}>Partager</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeAction, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.closeActionLabel}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },

  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  image: StyleSheet.absoluteFillObject,

  iconCard: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  answerCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  answerLabel: { fontSize: font.sm, color: colors.textDim },
  answerText: { fontSize: font.xl, fontWeight: '700', textAlign: 'center' },

  gridSection: { alignItems: 'center', gap: spacing.sm },
  gridLabel: { fontSize: font.sm, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  actions: { gap: spacing.sm, marginTop: spacing.sm },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  shareBtnLabel: { fontSize: font.base, fontWeight: '600', color: colors.text },
  closeAction: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  closeActionLabel: { fontSize: font.base, color: colors.textDim, fontWeight: '500' },
});
