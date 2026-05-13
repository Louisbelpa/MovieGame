import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseModal } from './BaseModal';
import { colors, spacing, radius, font } from '../../theme';
import type { PersonalStats } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  stats: PersonalStats | null;
  mediaType: string;
}

interface StatBoxProps {
  value: number | string;
  label: string;
}

function StatBox({ value, label }: StatBoxProps) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatsModal({ visible, onClose, stats, mediaType }: Props) {
  const winRate =
    stats && stats.gamesPlayed > 0
      ? Math.round((stats.wins / stats.gamesPlayed) * 100)
      : 0;

  const maxDist = stats
    ? Math.max(...Object.values(stats.distribution), 1)
    : 1;

  const modeLabel = mediaType === 'wiki' ? 'WikiGuessr' : mediaType === 'series' ? 'Séries' : 'Films';

  return (
    <BaseModal visible={visible} onClose={onClose} title={`Statistiques — ${modeLabel}`}>
      {!stats || stats.gamesPlayed === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucune partie jouée pour l'instant.</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.row}>
            <StatBox value={stats.gamesPlayed} label="Parties" />
            <StatBox value={`${winRate}%`} label="Victoires" />
            <StatBox value={stats.currentStreak} label="Série en cours" />
            <StatBox value={stats.maxStreak} label="Meilleure série" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribution des tentatives</Text>
            {Object.entries(stats.distribution)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([attempt, count]) => (
                <View key={attempt} style={styles.distRow}>
                  <Text style={styles.distAttempt}>{attempt}</Text>
                  <View style={styles.distBarContainer}>
                    <View
                      style={[
                        styles.distBar,
                        { width: `${(count / maxDist) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              ))}
          </View>
        </View>
      )}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: font.md, color: colors.textDim },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: spacing.xs },
  statValue: { fontSize: font.xxl, fontWeight: '700', color: colors.gold },
  statLabel: { fontSize: font.sm, color: colors.textDim, textAlign: 'center' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: font.md, fontWeight: '600', color: colors.text },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  distAttempt: { fontSize: font.base, color: colors.textDim, width: 20, textAlign: 'center' },
  distBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  distBar: { height: '100%', backgroundColor: colors.gold, borderRadius: radius.sm },
  distCount: { fontSize: font.base, color: colors.textDim, width: 24, textAlign: 'right' },
});
