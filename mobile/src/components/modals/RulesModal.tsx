import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/Button';
import { colors, spacing, radius, font } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  mediaType: 'film' | 'series' | 'wiki';
}

interface RuleItemProps {
  icon: string;
  text: string;
}

function RuleItem({ icon, text }: RuleItemProps) {
  return (
    <View style={styles.ruleItem}>
      <Ionicons name={icon as any} size={20} color={colors.gold} style={styles.ruleIcon} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const FILM_RULES = [
  { icon: 'eye-outline', text: 'Une image floue est révélée. Identifiez le film !' },
  { icon: 'close-circle-outline', text: "À chaque mauvaise réponse, l'image devient moins floue." },
  { icon: 'bulb-outline', text: 'Des indices (année, réalisateur, acteur) apparaissent progressivement.' },
  { icon: 'repeat-outline', text: '6 tentatives au total — jouez chaque jour !' },
  { icon: 'play-skip-forward-outline', text: 'Vous pouvez passer une tentative pour révéler l\'image.' },
];

const WIKI_RULES = [
  { icon: 'person-circle-outline', text: 'Une personnalité réelle est cachée derrière des indices.' },
  { icon: 'information-circle-outline', text: 'Carrière, rôles, clubs, domaine… utilisez les indices.' },
  { icon: 'close-circle-outline', text: "Chaque mauvaise réponse révèle la photo progressivement." },
  { icon: 'repeat-outline', text: '5 tentatives par défi — une personnalité différente chaque jour !' },
];

export function RulesModal({ visible, onClose, mediaType }: Props) {
  const rules = mediaType === 'wiki' ? WIKI_RULES : FILM_RULES;
  const title = mediaType === 'wiki' ? 'Règles — WikiGuessr' : `Règles — ${mediaType === 'series' ? 'Séries' : 'Films'}`;

  return (
    <BaseModal visible={visible} onClose={onClose} title={title}>
      <View style={styles.container}>
        <View style={styles.rulesContainer}>
          {rules.map((rule, i) => (
            <RuleItem key={i} icon={rule.icon} text={rule.text} />
          ))}
        </View>

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
          <Text style={styles.tipText}>
            Un nouveau défi chaque jour à minuit, heure de Paris.
          </Text>
        </View>

        <Button label="C'est parti !" onPress={onClose} fullWidth />
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  rulesContainer: { gap: spacing.lg },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleIcon: { marginTop: 2 },
  ruleText: { flex: 1, fontSize: font.md, color: colors.text, lineHeight: 22 },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#1a1400',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#2a2200',
  },
  tipText: { flex: 1, fontSize: font.sm, color: colors.textDim, lineHeight: 18 },
});
