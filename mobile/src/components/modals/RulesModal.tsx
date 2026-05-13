import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { BaseModal } from './BaseModal';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, radius, font, accentFor } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  mediaType: 'film' | 'series' | 'wiki';
}

// Icônes SVG légères
function EyeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}
function XCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}
function BulbIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21h6M12 3a7 7 0 0 1 7 7c0 3-1.8 5.5-4 6.5V18H9v-1.5C6.8 15.5 5 13 5 10a7 7 0 0 1 7-7z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function RepeatIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M17 1l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SkipIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4l10 8-10 8V4z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 5v14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}
function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}
function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

type IconKey = 'eye' | 'xcircle' | 'bulb' | 'repeat' | 'skip' | 'person' | 'info';

const ICON_MAP: Record<IconKey, (color: string) => React.ReactElement> = {
  eye:    (c) => <EyeIcon color={c} />,
  xcircle:(c) => <XCircleIcon color={c} />,
  bulb:   (c) => <BulbIcon color={c} />,
  repeat: (c) => <RepeatIcon color={c} />,
  skip:   (c) => <SkipIcon color={c} />,
  person: (c) => <PersonIcon color={c} />,
  info:   (c) => <InfoIcon color={c} />,
};

const FILM_RULES: { icon: IconKey; text: string }[] = [
  { icon: 'eye',     text: 'Une image floue est révélée. Identifiez le film !' },
  { icon: 'xcircle', text: "À chaque mauvaise réponse, l'image devient moins floue." },
  { icon: 'bulb',    text: 'Des indices (année, réalisateur, acteur) apparaissent progressivement.' },
  { icon: 'repeat',  text: '6 tentatives au total — jouez chaque jour !' },
  { icon: 'skip',    text: "Vous pouvez passer une tentative pour révéler l'image." },
];
const WIKI_RULES: { icon: IconKey; text: string }[] = [
  { icon: 'person',  text: 'Une personnalité réelle est cachée derrière des indices.' },
  { icon: 'info',    text: 'Carrière, rôles, clubs, domaine… utilisez les indices.' },
  { icon: 'xcircle', text: "Chaque mauvaise réponse révèle la photo progressivement." },
  { icon: 'repeat',  text: '5 tentatives par défi — une personnalité différente chaque jour !' },
];

export function RulesModal({ visible, onClose, mediaType }: Props) {
  const rules = mediaType === 'wiki' ? WIKI_RULES : FILM_RULES;
  const title = mediaType === 'wiki' ? 'Règles — WikiGuessr' : `Règles — ${mediaType === 'series' ? 'Séries' : 'Films'}`;
  const accent = accentFor(mediaType === 'wiki' ? 'wiki' : mediaType === 'series' ? 'series' : 'film');

  return (
    <BaseModal visible={visible} onClose={onClose} title={title}>
      <View style={styles.container}>
        <View style={styles.rulesContainer}>
          {rules.map((rule, i) => (
            <View key={i} style={styles.ruleItem}>
              <View style={[styles.ruleIconWrap, { backgroundColor: accent.soft }]}>
                {ICON_MAP[rule.icon](accent.color)}
              </View>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        <GlassView style={styles.tip} intensity={30} specular={false}>
          <InfoIcon color={colors.gold} />
          <Text style={styles.tipText}>
            Un nouveau défi chaque jour à minuit, heure de Paris.
          </Text>
        </GlassView>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.ctaBtn, { backgroundColor: accent.color }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaLabel}>C'est parti !</Text>
        </Pressable>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  rulesContainer: { gap: spacing.md },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  ruleText: { flex: 1, fontSize: font.base, color: colors.text, lineHeight: 22 },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.goldRing ?? 'rgba(212,166,74,0.30)',
  },
  tipText: { flex: 1, fontSize: font.sm, color: colors.textDim, lineHeight: 18 },
  ctaBtn: {
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  ctaLabel: { fontSize: font.base, fontWeight: '700', color: colors.white },
});
