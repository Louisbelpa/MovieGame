import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { BaseModal } from './BaseModal';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, radius, font } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  fetchDates: () => Promise<string[]>;
  currentDate: string;
  accentColor?: string;
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CalDayIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}


function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

function groupByMonth(dates: string[]): { month: string; dates: string[] }[] {
  const map = new Map<string, string[]>();
  for (const d of dates) {
    const month = d.slice(0, 7); // YYYY-MM
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(d);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, ds]) => ({ month, dates: ds }));
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function ArchiveModal({ visible, onClose, onSelectDate, fetchDates, currentDate, accentColor }: Props) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const accent = accentColor ?? colors.gold;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchDates()
      .then(setDates)
      .finally(() => setLoading(false));
  }, [visible]);

  const today = getTodayParis();
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));

  type FlatItem =
    | { type: 'header'; month: string }
    | { type: 'date'; date: string };

  const flatData: FlatItem[] = [];
  const groups = groupByMonth(sorted);
  for (const g of groups) {
    flatData.push({ type: 'header', month: g.month });
    for (const d of g.dates) {
      flatData.push({ type: 'date', date: d });
    }
  }

  return (
    <BaseModal visible={visible} onClose={onClose} title="Archives" scrollable={false}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.type === 'header' ? `h-${item.month}` : item.date}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{formatMonth(item.month)}</Text>
                </View>
              );
            }
            const d = item.date;
            const isToday = d === today;
            const isCurrent = d === currentDate;
            const isFirst = index === 0 || flatData[index - 1]?.type === 'header';
            const isLast = index === flatData.length - 1 || flatData[index + 1]?.type === 'header';

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.dateCell,
                  isFirst && styles.dateCellFirst,
                  isLast && styles.dateCellLast,
                  isCurrent && { backgroundColor: `${accent}18` },
                  pressed && styles.dateCellPressed,
                ]}
                onPress={() => {
                  onSelectDate(d);
                  onClose();
                }}
              >
                <View style={styles.dateCellLeft}>
                  <Text style={[styles.dateMain, isCurrent && { color: accent }]}>
                    {isToday ? "Aujourd'hui" : formatDate(d)}
                  </Text>
                  <Text style={styles.dateSub}>{formatDateShort(d)}</Text>
                </View>
                {isCurrent && (
                  <View style={[styles.checkBadge, { backgroundColor: `${accent}22` }]}>
                    <CheckIcon color={accent} />
                  </View>
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
        />
      )}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { fontSize: font.sm, color: colors.textDim },

  list: { paddingBottom: spacing.xl },

  monthHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  monthLabel: {
    fontSize: font.sm,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  dateCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
  },
  dateCellFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dateCellLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dateCellPressed: { opacity: 0.7 },

  dateCellLeft: { gap: 2 },
  dateMain: { fontSize: font.base, fontWeight: '500', color: colors.text },
  dateSub: { fontSize: font.xs, color: colors.textFaint },

  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: spacing.lg,
  },
});
