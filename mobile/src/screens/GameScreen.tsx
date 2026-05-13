import React, { useEffect, useCallback, useRef } from 'react';
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
import { useGameStore } from '../store/gameStore';
import { MovieImage } from '../components/game/MovieImage';
import { AttemptTracker } from '../components/game/AttemptTracker';
import { HintPanel } from '../components/game/HintPanel';
import { GuessInput } from '../components/game/GuessInput';
import { DateNavBar } from '../components/game/DateNavBar';
import { WinModal } from '../components/modals/WinModal';
import { LoseModal } from '../components/modals/LoseModal';
import { StatsModal } from '../components/modals/StatsModal';
import { RulesModal } from '../components/modals/RulesModal';
import { ArchiveModal } from '../components/modals/ArchiveModal';
import { Spinner } from '../components/ui/Spinner';
import { challengeApi } from '../api/client';
import { colors, spacing, font, radius } from '../theme';
import { gameStorage } from '../lib/storage';
import { FEATURES } from '../config/features';

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export function GameScreen() {
  const insets = useSafeAreaInsets();
  const store = useGameStore();

  useEffect(() => {
    store.initGame();
    store.loadStats();

    gameStorage.getRulesSeen(store.mediaType).then((seen) => {
      if (!seen) store.openModal('rules');
    });
  }, [store.mediaType]);

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

  const handleSubmit = useCallback(
    (guess: string) => store.submitGuess(guess),
    [store],
  );

  const handleRulesClose = () => {
    gameStorage.setRulesSeen(store.mediaType);
    store.closeModal();
  };

  const fetchDates = () =>
    challengeApi.getDates(365, store.mediaType as 'film' | 'series');

  if (store.isLoading && !store.challenge) {
    return <Spinner fullScreen />;
  }

  if (store.status === 'not_found' || !store.challenge) {
    return (
      <View style={[styles.emptyState, { paddingTop: insets.top + spacing.xl }]}>
        <Ionicons name="film-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Aucun défi disponible</Text>
        <Text style={styles.emptySubtitle}>Revenez demain pour un nouveau défi !</Text>
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
        <DateNavBar
          challenge={challenge}
          viewingDate={store.viewingDate}
          onPrev={() => store.navigateDate('prev')}
          onNext={() => store.navigateDate('next')}
          onToday={() => store.initGame()}
          isLoading={store.isLoading}
        />

        <MovieImage
          uri={challenge.imageUrl}
          blurIndex={challenge.attemptsUsed}
          maxAttempts={challenge.maxAttempts}
        />

        <View style={styles.section}>
          <AttemptTracker attempts={challenge.attempts} maxAttempts={challenge.maxAttempts} />
        </View>

        {!isOver && (
          <View style={styles.section}>
            <GuessInput
              value={store.inputValue}
              onChangeText={handleChangeText}
              onSubmit={handleSubmit}
              onSkip={store.skipAttempt}
              suggestions={store.suggestions}
              isSuggestionsLoading={store.isSuggestionsLoading}
              isSubmitting={store.isSubmitting}
              disabled={isOver}
              shakeTrigger={store.shakeTrigger}
              placeholder={store.mediaType === 'series' ? 'Entrez un titre de série…' : 'Entrez un titre de film…'}
            />
          </View>
        )}

        {challenge.hints.length > 0 && (
          <View style={styles.section}>
            <HintPanel
              hints={challenge.hints}
              hintsRevealed={challenge.hintsRevealed}
              maxAttempts={challenge.maxAttempts}
            />
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => { store.loadStats(); store.openModal('stats'); }}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            accessibilityLabel="Statistiques"
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.textDim} />
            <Text style={styles.actionText}>Stats</Text>
          </Pressable>

          <Pressable
            onPress={() => store.openModal('archive')}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            accessibilityLabel="Archives"
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textDim} />
            <Text style={styles.actionText}>Archives</Text>
          </Pressable>

          <Pressable
            onPress={() => store.openModal('rules')}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            accessibilityLabel="Règles"
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
        title={challenge.mediaType === 'series' ? 'Série trouvée !' : 'Film trouvé !'}
      />

      <LoseModal
        visible={store.modal.type === 'lose'}
        onClose={store.closeModal}
        challenge={challenge}
      />

      <StatsModal
        visible={store.modal.type === 'stats'}
        onClose={store.closeModal}
        stats={store.personalStats}
        mediaType={store.mediaType}
      />

      <RulesModal
        visible={store.modal.type === 'rules'}
        onClose={handleRulesClose}
        mediaType={store.mediaType as 'film' | 'series' | 'wiki'}
      />

      <ArchiveModal
        visible={store.modal.type === 'archive'}
        onClose={store.closeModal}
        onSelectDate={(date) => store.loadDate(date)}
        fetchDates={fetchDates}
        currentDate={challenge.date}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
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
  actionBtn: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  actionBtnPressed: { backgroundColor: colors.surface2 },
  actionText: { fontSize: font.sm, color: colors.textDim },
});
