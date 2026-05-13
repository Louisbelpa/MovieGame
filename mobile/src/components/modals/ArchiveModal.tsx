import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseModal } from './BaseModal';
import { colors, spacing, radius, font } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  fetchDates: () => Promise<string[]>;
  currentDate: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

export function ArchiveModal({ visible, onClose, onSelectDate, fetchDates, currentDate }: Props) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchDates()
      .then(setDates)
      .finally(() => setLoading(false));
  }, [visible]);

  const today = getTodayParis();
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));

  return (
    <BaseModal visible={visible} onClose={onClose} title="Archives" scrollable={false}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isToday = item === today;
            const isCurrent = item === currentDate;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.dateItem,
                  isCurrent && styles.dateItemActive,
                  pressed && styles.dateItemPressed,
                ]}
                onPress={() => {
                  onSelectDate(item);
                  onClose();
                }}
              >
                <View>
                  <Text style={[styles.dateText, isCurrent && styles.dateTextActive]}>
                    {isToday ? "Aujourd'hui" : formatDate(item)}
                  </Text>
                  <Text style={styles.dateISO}>{item}</Text>
                </View>
                {isCurrent && <Ionicons name="checkmark" size={18} color={colors.gold} />}
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: spacing.sm },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateItemActive: { backgroundColor: '#1a1400' },
  dateItemPressed: { backgroundColor: colors.surface2 },
  dateText: { fontSize: font.md, color: colors.text, fontWeight: '500' },
  dateTextActive: { color: colors.gold },
  dateISO: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
});
