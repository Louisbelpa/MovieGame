import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWikiStore } from '../store/wikiStore';
import { WikiImage } from '../components/wiki/WikiImage';
import { WikiGuessInput } from '../components/wiki/WikiGuessInput';
import { WikiHintPanel } from '../components/wiki/WikiHintPanel';
import { AttemptTracker } from '../components/game/AttemptTracker';
import { WinModal } from '../components/modals/WinModal';
import { LoseModal } from '../components/modals/LoseModal';
import { StatsModal } from '../components/modals/StatsModal';
import { RulesModal } from '../components/modals/RulesModal';
import { ArchiveModal } from '../components/modals/ArchiveModal';
import { Spinner } from '../components/ui/Spinner';
import { wikiApi } from '../api/wikiClient';
import { colors, spacing, font, radius } from '../theme';
import { gameStorage } from '../lib/storage';

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function WikiScreen() {
  const insets = useSafeAreaInsets();
  const store = useWikiStore();

  useEffect(() => {
    store.initGame();
    store.loadStats();
    gameStorage.getRulesSeen('wiki').then((seen) => {
      if (!seen) store.openModal('rules');
    });
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      store.setInputValue(text);
      if (searchTimeout) clearTimeout(searchTimeout);
      if (text.length >= 2) {
        searchTimeout = setTimeout(() => store.searchSuggestions(text), 250);
      } else {
        store.clearSuggestions();
      }
    },
    [store],
  );

  const handleRulesClose = () => {
    gameStorage.setRulesSeen('wiki');
    store.closeModal();
  };

  if (store.isLoading && !store.challenge) {
    return <Spinner fullScreen />;
  }

  if (store.status === 'not_found' || !store.challenge) {
    return (
      <View style={[styles.emptyState, { paddingTop: insets.top + spacing.xl }]}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Aucun défi disponible</Text>
        <Text style={styles.emptySubtitle}>Revenez demain !</Text>
        <Pressable onPress={() => store.initGame()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const { challenge, status } = store;
  const isOver = status === 'won' || status === 'lost';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={store.isLoading}
            onRefresh={() => store.initGame()}
            tintColor={colors.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.challengeDate}>{formatDate(challenge.date)}</Text>
            <Text style={styles.challengeNum}>WikiGuessr #{challenge.challengeNumber}</Text>
          </View>
          <View style={styles.navRow}>
            <Pressable
              onPress={() => store.navigateDate('prev')}
              disabled={!challenge.hasPrevChallenge || store.isLoading}
              style={({ pressed }) => [styles.navBtn, !challenge.hasPrevChallenge && styles.disabled, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={20} color={challenge.hasPrevChallenge ? colors.text : colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => store.navigateDate('next')}
              disabled={!challenge.hasNextChallenge || store.isLoading}
              style={({ pressed }) => [styles.navBtn, !challenge.hasNextChallenge && styles.disabled, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-forward" size={20} color={challenge.hasNextChallenge ? colors.text : colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <WikiImage
          photoUrl={challenge.photoUrl}
          attemptsUsed={challenge.attemptsUsed}
          maxAttempts={challenge.maxAttempts}
        />

        <View style={styles.section}>
          <AttemptTracker attempts={challenge.attempts} maxAttempts={challenge.maxAttempts} />
        </View>

        {!isOver && (
          <View style={styles.section}>
            <WikiGuessInput
              value={store.inputValue}
              onChangeText={handleChangeText}
              onSubmit={(guess) => store.submitGuess(guess)}
              onSkip={store.skipAttempt}
              suggestions={store.suggestions}
              isSuggestionsLoading={store.isSuggestionsLoading}
              isSubmitting={store.isSubmitting}
              disabled={isOver}
              shakeTrigger={store.shakeTrigger}
            />
          </View>
        )}

        <View style={styles.section}>
          <WikiHintPanel challenge={challenge} />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => { store.loadStats(); store.openModal('stats'); }}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.textDim} />
            <Text style={styles.actionText}>Stats</Text>
          </Pressable>

          <Pressable
            onPress={() => store.openModal('archive')}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textDim} />
            <Text style={styles.actionText}>Archives</Text>
          </Pressable>

          <Pressable
            onPress={() => store.openModal('rules')}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.textDim} />
            <Text style={styles.actionText}>Règles</Text>
          </Pressable>
        </View>
      </ScrollView>

      <WinModal
        visible={store.modal.type === 'win'}
        onClose={store.closeModal}
        challenge={challenge}
        title="Personnalité trouvée !"
      />

      <LoseModal
        visible={store.modal.type === 'lose'}
        onClose={store.closeModal}
        challenge={challenge}
        imageUrl={challenge.photoUrl ?? undefined}
      />

      <StatsModal
        visible={store.modal.type === 'stats'}
        onClose={store.closeModal}
        stats={store.personalStats}
        mediaType="wiki"
      />

      <RulesModal
        visible={store.modal.type === 'rules'}
        onClose={handleRulesClose}
        mediaType="wiki"
      />

      <ArchiveModal
        visible={store.modal.type === 'archive'}
        onClose={store.closeModal}
        onSelectDate={(date) => store.loadDate(date)}
        fetchDates={() => wikiApi.getDates(365)}
        currentDate={challenge.date}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  challengeDate: { fontSize: font.base, color: colors.text, fontWeight: '500' },
  challengeNum: { fontSize: font.sm, color: colors.textDim, marginTop: 2 },
  navRow: { flexDirection: 'row', gap: spacing.xs },
  navBtn: { padding: spacing.sm },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.6 },
  section: { gap: spacing.md },
  emptyState: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: font.md, color: colors.textDim, textAlign: 'center' },
  retryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { fontSize: font.md, color: colors.gold },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  actionBtn: { alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md },
  actionBtnPressed: { backgroundColor: colors.surface2 },
  actionText: { fontSize: font.sm, color: colors.textDim },
});
