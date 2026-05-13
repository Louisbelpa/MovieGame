import React from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Svg, Path, Circle, Polyline } from 'react-native-svg';
import { BaseModal } from './BaseModal';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, radius, font, accentFor } from '../../theme';
import type { DailyChallenge, WikiChallenge } from '../../types';

function TrophyIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21h8M12 17v4M17 3H7l1 8a4 4 0 0 0 8 0l1-8z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 4H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 4h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
  title?: string;
}

export function WinModal({ visible, onClose, challenge, title }: Props) {
  const grid = buildEmojiGrid(challenge);
  const isTodayChallenge = !challenge.isPastChallenge;
  const accent = accentFor(challenge.mediaType as any);

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

  const attempts = challenge.attemptsUsed;

  return (
    <BaseModal visible={visible} onClose={onClose} title="Bravo !" scrollable={false}>
      <View style={styles.container}>

        {/* Trophy card */}
        <GlassView style={[styles.trophyCard, { borderColor: accent.ring }]} intensity={40} specular={false}>
          <View style={[styles.trophyBg, { backgroundColor: accent.soft }]}>
            <TrophyIcon color={accent.color} />
          </View>
          <Text style={[styles.winTitle, { color: accent.color }]}>
            {title ?? 'Vous avez trouvé !'}
          </Text>
          <Text style={styles.attemptsText}>
            {attempts === 1 ? 'En seulement 1 tentative !' : `En ${attempts} tentatives`}
          </Text>
        </GlassView>

        {/* Emoji grid */}
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
            {/* Tentatives restantes */}
            {Array.from({ length: challenge.maxAttempts - challenge.attemptsUsed }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dotEmpty} />
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isTodayChallenge && (
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.shareBtn, { backgroundColor: accent.color }, pressed && { opacity: 0.8 }]}
            >
              <ShareIcon />
              <Text style={styles.shareBtnLabel}>Partager</Text>
            </Pressable>
          )}
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
  container: { flex: 1, gap: spacing.xl, justifyContent: 'space-between' },

  trophyCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: spacing.md,
  },
  trophyBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winTitle: {
    fontSize: font.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  attemptsText: {
    fontSize: font.base,
    color: colors.textDim,
    textAlign: 'center',
  },

  gridSection: { alignItems: 'center', gap: spacing.sm },
  gridLabel: { fontSize: font.sm, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  actions: { gap: spacing.sm },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  shareBtnLabel: { fontSize: font.base, fontWeight: '600', color: colors.white },
  closeAction: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  closeActionLabel: { fontSize: font.base, color: colors.textDim, fontWeight: '500' },
});
