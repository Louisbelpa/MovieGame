import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  Keyboard,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { GlassView } from '../components/ui/GlassView';
import { useWikiStore } from '../store/wikiStore';
import { WikiImage } from '../components/wiki/WikiImage';
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
import type { WikiSearchResult, GuessEntry } from '../types';

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// ── Icônes ────────────────────────────────────────────────────────────────────
const WikiIcon = ({ color = colors.wiki, size = 15 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const HelpIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={colors.textDim} strokeWidth="1.8" />
    <Path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2.2-2.5 4" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="17" r="0.6" fill={colors.textDim} />
  </Svg>
);
const CalIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="16" rx="2" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 10h18M8 3v4M16 3v4" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CalSmallIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="16" rx="2" stroke={colors.wiki} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 10h18M8 3v4M16 3v4" stroke={colors.wiki} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SearchIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={colors.textFaint} strokeWidth="1.8" />
    <Path d="M21 21l-5-5" stroke={colors.textFaint} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const ChevronLeft = ({ dim }: { dim?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={dim ? colors.textFaint : colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronRight = ({ dim }: { dim?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={dim ? colors.textFaint : colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Header WikiGuessr (Liquid Glass) ──────────────────────────────────────────
function WikiHeader({
  challengeNumber,
  onHelp,
  onCalendar,
}: {
  challengeNumber?: number;
  onHelp: () => void;
  onCalendar: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <GlassView
      style={[styles.header, { paddingTop: insets.top, borderBottomColor: 'rgba(255,255,255,0.08)' }]}
      intensity={95}
      specular={false}
    >
      <View style={styles.headerInner}>
        <Pressable onPress={onHelp} style={styles.iconBtn} hitSlop={8}>
          <HelpIcon />
        </Pressable>

        <View style={styles.wordmarkRow}>
          <WikiIcon size={15} />
          <Text style={[styles.wordmark, { color: colors.wiki }]}>WikiGuessr</Text>
          {challengeNumber != null && (
            <Text style={styles.challengeNum}>#{challengeNumber}</Text>
          )}
        </View>

        <Pressable onPress={onCalendar} style={styles.iconBtn} hitSlop={8}>
          <CalIcon />
        </Pressable>
      </View>
    </GlassView>
  );
}

// ── Date nav ──────────────────────────────────────────────────────────────────
function DateNav({ challenge, viewingDate, onPrev, onNext, onToday, isLoading }: any) {
  const isPast = Boolean(viewingDate);
  const label = isPast
    ? new Date(challenge.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : "Aujourd'hui";
  return (
    <View style={styles.dateNav}>
      <Pressable onPress={onPrev} disabled={!challenge.hasPrevChallenge || isLoading} style={[styles.navBtn, !challenge.hasPrevChallenge && { opacity: 0.3 }]}>
        <ChevronLeft dim={!challenge.hasPrevChallenge} />
      </Pressable>
      <Pressable onPress={isPast ? onToday : undefined} style={styles.dateCenter}>
        <CalSmallIcon />
        <Text style={[styles.dateLabel, isPast && { color: colors.textDim }]}>{label}</Text>
        {isPast && <Text style={[styles.returnToday, { color: colors.wiki }]}>↑ Aujourd'hui</Text>}
      </Pressable>
      <Pressable onPress={onNext} disabled={!challenge.hasNextChallenge || isLoading} style={[styles.navBtn, !challenge.hasNextChallenge && { opacity: 0.3 }]}>
        <ChevronRight dim={!challenge.hasNextChallenge} />
      </Pressable>
    </View>
  );
}

// ── Tentatives passées ────────────────────────────────────────────────────────
function AttemptList({ attempts }: { attempts: GuessEntry[] }) {
  if (attempts.length === 0) return null;
  return (
    <View style={styles.attemptSection}>
      <Text style={styles.sectionLabel}>Tentatives</Text>
      {attempts.map((a, i) => (
        <View key={i} style={styles.attemptCell}>
          <View style={[styles.attemptIndex, a.correct ? styles.indexCorrect : a.skipped ? styles.indexSkip : styles.indexWrong]}>
            <Text style={[styles.attemptIndexText, a.correct ? { color: colors.green } : a.skipped ? { color: colors.textFaint } : { color: colors.red }]}>
              {i + 1}
            </Text>
          </View>
          <Text style={[styles.attemptGuess, !a.correct && !a.skipped && { color: '#e08570' }]} numberOfLines={1}>
            {a.guess || (a.skipped ? 'Passé' : '—')}
          </Text>
          {a.correct  && <Text style={styles.tagOk}>✓</Text>}
          {!a.correct && !a.skipped && <Text style={styles.tagKo}>✗</Text>}
        </View>
      ))}
    </View>
  );
}

// ── Barre de recherche Wiki (glass pinned) ────────────────────────────────────
function WikiInputBar({
  value,
  onChangeText,
  onSubmit,
  onSkip,
  suggestions,
  isSuggestionsLoading,
  isSubmitting,
  disabled,
  shakeTrigger,
  bottomInset,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: (g: string) => void;
  onSkip: () => void;
  suggestions: WikiSearchResult[];
  isSuggestionsLoading: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  shakeTrigger: number;
  bottomInset: number;
}) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (shakeTrigger === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shakeTrigger]);

  useEffect(() => { setShowDropdown(suggestions.length > 0 && value.length >= 2); }, [suggestions, value]);

  const submit = (name?: string) => {
    const guess = name ?? value.trim();
    if (!guess || isSubmitting || disabled) return;
    setShowDropdown(false);
    Keyboard.dismiss();
    onSubmit(guess);
  };

  return (
    <Animated.View style={[styles.inputWrapper, { transform: [{ translateX: shakeAnim }] }]}>
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => submit(item.name)}
              style={({ pressed }) => [styles.suggestionRow, pressed && { backgroundColor: colors.surface }]}
            >
              <Text style={styles.suggestionTitle} numberOfLines={1}>{item.name}</Text>
              {item.personType ? <Text style={styles.suggestionDesc} numberOfLines={1}>{item.personType}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      <GlassView
        style={[styles.inputBar, { paddingBottom: Math.max(bottomInset, 12), borderTopColor: 'rgba(255,255,255,0.10)' }]}
        intensity={95}
        specular
      >
        <View style={styles.inputRow}>
          <View style={[styles.inputFieldWrap, { borderColor: `${colors.wiki}40` }]}>
            <SearchIcon />
            <TextInput
              style={styles.inputField}
              value={value}
              onChangeText={(t) => { onChangeText(t); setShowDropdown(t.length >= 2); }}
              placeholder="Nom de la personnalité…"
              placeholderTextColor={colors.textFaint}
              editable={!disabled && !isSubmitting}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={() => submit()}
            />
            {isSuggestionsLoading && <ActivityIndicator size="small" color={colors.textFaint} />}
          </View>
          <Pressable
            onPress={() => submit()}
            disabled={!value.trim() || isSubmitting || disabled}
            style={[styles.devinerBtn, { backgroundColor: colors.wiki }, (!value.trim() || disabled) && { opacity: 0.4 }]}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.devinerLabel}>Deviner</Text>
            }
          </Pressable>
        </View>
      </GlassView>
    </Animated.View>
  );
}

// ── WikiScreen ────────────────────────────────────────────────────────────────
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

  const handleChangeText = useCallback((text: string) => {
    store.setInputValue(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (text.length >= 2) {
      searchTimeout = setTimeout(() => store.searchSuggestions(text), 250);
    } else {
      store.clearSuggestions();
    }
  }, [store]);

  const handleRulesClose = () => {
    gameStorage.setRulesSeen('wiki');
    store.closeModal();
  };

  if (store.isLoading && !store.challenge) {
    return (
      <View style={styles.root}>
        <WikiHeader onHelp={() => store.openModal('rules')} onCalendar={() => store.openModal('archive')} />
        <Spinner fullScreen />
      </View>
    );
  }

  if (store.status === 'not_found' || !store.challenge) {
    return (
      <View style={styles.root}>
        <WikiHeader onHelp={() => store.openModal('rules')} onCalendar={() => store.openModal('archive')} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucun défi</Text>
          <Text style={styles.emptySub}>Revenez demain pour une nouvelle personnalité !</Text>
          <Pressable onPress={() => store.initGame()} style={styles.retryBtn}>
            <Text style={[styles.retryText, { color: colors.wiki }]}>Réessayer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { challenge, status } = store;
  const isOver = status === 'won' || status === 'lost';

  return (
    <View style={styles.root}>
      <WikiHeader
        challengeNumber={challenge.challengeNumber}
        onHelp={() => store.openModal('rules')}
        onCalendar={() => store.openModal('archive')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isOver ? insets.bottom + 100 : insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={store.isLoading}
            onRefresh={() => store.initGame()}
            tintColor={colors.wiki}
          />
        }
      >
        <DateNav
          challenge={challenge}
          viewingDate={store.viewingDate}
          onPrev={() => store.navigateDate('prev')}
          onNext={() => store.navigateDate('next')}
          onToday={() => store.initGame()}
          isLoading={store.isLoading}
        />

        {/* Photo hero */}
        <WikiImage
          photoUrl={challenge.photoUrl}
          attemptsUsed={challenge.attemptsUsed}
          maxAttempts={challenge.maxAttempts}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          <AttemptTracker
            attempts={challenge.attempts}
            maxAttempts={challenge.maxAttempts}
            accentColor={colors.wiki}
            accentSoft={colors.wikiSoft}
          />
          <Text style={styles.counter}>
            {challenge.attemptsUsed}/{challenge.maxAttempts}
          </Text>
        </View>

        {/* Indices wiki */}
        <WikiHintPanel challenge={challenge} />

        {/* Tentatives passées */}
        <AttemptList attempts={challenge.attempts} />

        <Pressable
          onPress={() => { store.loadStats(); store.openModal('stats'); }}
          style={styles.statsLink}
        >
          <Text style={styles.statsLinkText}>Mes statistiques</Text>
        </Pressable>
      </ScrollView>

      {/* Input glass pinné en bas */}
      {!isOver && (
        <WikiInputBar
          value={store.inputValue}
          onChangeText={handleChangeText}
          onSubmit={(guess) => store.submitGuess(guess)}
          onSkip={store.skipAttempt}
          suggestions={store.suggestions}
          isSuggestionsLoading={store.isSuggestionsLoading}
          isSubmitting={store.isSubmitting}
          disabled={isOver}
          shakeTrigger={store.shakeTrigger}
          bottomInset={insets.bottom + 88}
        />
      )}

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
        accentColor={colors.wiki}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerInner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmark: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  challengeNum: { fontSize: 11, color: colors.textFaint },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },

  dateNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { padding: 8 },
  dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  dateLabel: { fontSize: 13, fontWeight: '500', color: colors.wiki },
  returnToday: { fontSize: 11, marginLeft: 4 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 11, color: colors.textFaint },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  attemptSection: { gap: 0 },
  attemptCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  attemptIndex: {
    width: 20, height: 20, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  indexCorrect: { borderColor: `${colors.green}50`, backgroundColor: `${colors.green}18` },
  indexWrong:   { borderColor: `${colors.red}50`,   backgroundColor: `${colors.red}18` },
  indexSkip:    { borderColor: colors.borderStrong,  backgroundColor: 'transparent' },
  attemptIndexText: { fontSize: 10, fontWeight: '600' },
  attemptGuess: { flex: 1, fontSize: 13.5, color: colors.textDim },
  tagOk: { fontSize: 12, color: colors.green },
  tagKo: { fontSize: 12, color: colors.red },

  statsLink: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  statsLinkText: { fontSize: 12, color: colors.textFaint },

  // input bar pinned
  inputWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  inputBar: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  inputFieldWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1,
  },
  inputField: { flex: 1, fontSize: 15, color: colors.text },
  devinerBtn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12 },
  devinerLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },

  dropdown: {
    marginHorizontal: 14,
    marginBottom: 4,
    backgroundColor: colors.surface2,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionTitle: { fontSize: 14, color: colors.text },
  suggestionDesc: { fontSize: 12, color: colors.textDim, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  retryText: { fontSize: 14 },
});
