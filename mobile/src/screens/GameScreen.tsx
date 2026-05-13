import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  Platform,
  Keyboard,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Rect, Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { GlassView } from '../components/ui/GlassView';
import { useGameStore } from '../store/gameStore';
import { MovieImage } from '../components/game/MovieImage';
import { AttemptTracker } from '../components/game/AttemptTracker';
import { HintPanel } from '../components/game/HintPanel';
import { WinModal } from '../components/modals/WinModal';
import { LoseModal } from '../components/modals/LoseModal';
import { StatsModal } from '../components/modals/StatsModal';
import { RulesModal } from '../components/modals/RulesModal';
import { ArchiveModal } from '../components/modals/ArchiveModal';
import { Spinner } from '../components/ui/Spinner';
import { challengeApi } from '../api/client';
import { colors, spacing, font, radius, accentFor } from '../theme';
import { gameStorage } from '../lib/storage';
import type { GuessEntry } from '../types';

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// ── Icônes SVG ────────────────────────────────────────────────────────────────
function FilmIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 9h18M3 15h18M8 4v16M16 4v16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function TvIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 3l4 3 4-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function HelpIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={colors.textDim} strokeWidth="1.8" />
      <Path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2.2-2.5 4" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="12" cy="17" r="0.6" fill={colors.textDim} />
    </Svg>
  );
}
function CalIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={colors.textFaint} strokeWidth="1.8" />
      <Path d="M21 21l-5-5" stroke={colors.textFaint} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}
function ChevronLeft({ dim }: { dim?: boolean }) {
  const c = dim ? colors.textFaint : colors.text;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ChevronRight({ dim }: { dim?: boolean }) {
  const c = dim ? colors.textFaint : colors.text;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CalSmallIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={colors.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={colors.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── AppHeader (Liquid Glass) ───────────────────────────────────────────────────
function AppHeader({
  mediaType,
  challengeNumber,
  onHelp,
  onCalendar,
}: {
  mediaType: 'film' | 'series';
  challengeNumber?: number;
  onHelp: () => void;
  onCalendar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const accent = accentFor(mediaType);
  const ModeIcon = mediaType === 'series' ? TvIcon : FilmIcon;

  return (
    <GlassView
      style={[styles.header, { paddingTop: insets.top, borderBottomColor: 'rgba(255,255,255,0.08)' }]}
      intensity={80}
      specular={false}
    >
      <View style={styles.headerInner}>
        <Pressable onPress={onHelp} style={styles.iconBtn} hitSlop={8}>
          <HelpIcon />
        </Pressable>

        <View style={styles.wordmarkRow}>
          <ModeIcon color={accent.color} size={15} />
          <Text style={styles.wordmark}>ShowGuessr</Text>
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

// ── Mode tabs ─────────────────────────────────────────────────────────────────
function ModeTabs({ active, onSwitch }: { active: 'film' | 'series'; onSwitch: (m: 'film' | 'series') => void }) {
  return (
    <View style={styles.modeTabs}>
      <ModeTabItem Icon={FilmIcon} label="Films"  active={active === 'film'}   color={colors.films}  onPress={() => onSwitch('film')} />
      <ModeTabItem Icon={TvIcon}   label="Séries" active={active === 'series'} color={colors.series} onPress={() => onSwitch('series')} />
    </View>
  );
}
function ModeTabItem({ Icon, label, active, color, onPress }: { Icon: any; label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && { borderBottomColor: color }]}>
      <Icon color={active ? color : colors.textFaint} size={13} />
      <Text style={[styles.modeTabLabel, { color: active ? color : colors.textFaint, fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
    </Pressable>
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
        {isPast && <Text style={styles.returnToday}>↑ Aujourd'hui</Text>}
      </Pressable>
      <Pressable onPress={onNext} disabled={!challenge.hasNextChallenge || isLoading} style={[styles.navBtn, !challenge.hasNextChallenge && { opacity: 0.3 }]}>
        <ChevronRight dim={!challenge.hasNextChallenge} />
      </Pressable>
    </View>
  );
}

// ── Attempt list (natif) ───────────────────────────────────────────────────────
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
          {a.correct && <Text style={styles.attemptTag}>✓</Text>}
          {!a.correct && !a.skipped && <Text style={[styles.attemptTag, { color: colors.red }]}>✗</Text>}
        </View>
      ))}
    </View>
  );
}

// ── Input bar (Liquid Glass, pinné en bas) ────────────────────────────────────
function InputBar({
  value,
  onChangeText,
  onSubmit,
  onSkip,
  suggestions,
  isSuggestionsLoading,
  isSubmitting,
  disabled,
  shakeTrigger,
  placeholder,
  accentColor,
  bottomInset,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: (g: string) => void;
  onSkip: () => void;
  suggestions: { id: number; title: string; year: number }[];
  isSuggestionsLoading: boolean;
  isSubmitting: boolean;
  disabled: boolean;
  shakeTrigger: number;
  placeholder: string;
  accentColor: string;
  bottomInset: number;
}) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  const submit = () => {
    if (!value.trim() || isSubmitting || disabled) return;
    setShowDropdown(false);
    Keyboard.dismiss();
    onSubmit(value.trim());
  };

  const select = (title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDropdown(false);
    Keyboard.dismiss();
    onSubmit(title);
  };

  return (
    <Animated.View style={[styles.inputBarWrapper, { transform: [{ translateX: shakeAnim }] }]}>
      {/* Dropdown suggestions au-dessus */}
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => select(item.title)}
              style={({ pressed }) => [styles.suggestionRow, pressed && { backgroundColor: colors.surface }]}
            >
              <Text style={styles.suggestionTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.suggestionYear}>{item.year}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Barre principale — Liquid Glass */}
      <GlassView
        style={[styles.inputBar, { paddingBottom: Math.max(bottomInset, 12), borderTopColor: 'rgba(255,255,255,0.10)' }]}
        intensity={90}
        specular
      >
        <View style={styles.inputRow}>
          <View style={styles.inputFieldWrap}>
            <SearchIcon />
            <TextInput
              ref={inputRef}
              style={styles.inputField}
              value={value}
              onChangeText={(t) => { onChangeText(t); setShowDropdown(t.length >= 2); }}
              placeholder={placeholder}
              placeholderTextColor={colors.textFaint}
              editable={!disabled && !isSubmitting}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={submit}
            />
            {isSuggestionsLoading && <ActivityIndicator size="small" color={colors.textFaint} />}
          </View>

          <Pressable
            onPress={submit}
            disabled={!value.trim() || isSubmitting || disabled}
            style={[styles.devinerBtn, { backgroundColor: accentColor }, (!value.trim() || disabled) && { opacity: 0.4 }]}
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

// ── GameScreen principal ───────────────────────────────────────────────────────
export function GameScreen() {
  const insets = useSafeAreaInsets();
  const store = useGameStore();
  const mediaType = store.mediaType as 'film' | 'series';
  const accent = accentFor(mediaType);

  useEffect(() => {
    store.initGame();
    store.loadStats();
    gameStorage.getRulesSeen(store.mediaType).then((seen) => {
      if (!seen) store.openModal('rules');
    });
  }, [store.mediaType]);

  const handleChangeText = useCallback((text: string) => {
    store.setInputValue(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (text.length >= 2) {
      searchTimeout = setTimeout(() => store.searchSuggestions(text), 250);
    } else {
      store.clearSuggestions();
    }
  }, [store]);

  const handleSubmit = useCallback((guess: string) => store.submitGuess(guess), [store]);

  const handleRulesClose = () => {
    gameStorage.setRulesSeen(store.mediaType);
    store.closeModal();
  };

  const fetchDates = () => challengeApi.getDates(365, store.mediaType as 'film' | 'series');

  // ── États de chargement ────────────────────────────────────────────────────
  if (store.isLoading && !store.challenge) {
    return (
      <View style={styles.root}>
        <AppHeader mediaType={mediaType} onHelp={() => store.openModal('rules')} onCalendar={() => store.openModal('archive')} />
        <Spinner fullScreen />
      </View>
    );
  }

  if (store.status === 'not_found' || !store.challenge) {
    return (
      <View style={styles.root}>
        <AppHeader mediaType={mediaType} onHelp={() => store.openModal('rules')} onCalendar={() => store.openModal('archive')} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucun défi</Text>
          <Text style={styles.emptySub}>Revenez demain pour un nouveau défi !</Text>
          <Pressable onPress={() => store.initGame()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { challenge, status } = store;
  const isOver = status === 'won' || status === 'lost';
  const attemptsLeft = challenge.maxAttempts - challenge.attemptsUsed;

  return (
    <View style={styles.root}>
      {/* Header glass */}
      <AppHeader
        mediaType={mediaType}
        challengeNumber={challenge.challengeNumber}
        onHelp={() => store.openModal('rules')}
        onCalendar={() => store.openModal('archive')}
      />


      {/* Contenu scrollable */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isOver ? insets.bottom + 120 : insets.bottom + 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={store.isLoading}
            onRefresh={() => store.initGame()}
            tintColor={colors.gold}
          />
        }
      >
        {/* Navigation de date */}
        <DateNav
          challenge={challenge}
          viewingDate={store.viewingDate}
          onPrev={() => store.navigateDate('prev')}
          onNext={() => store.navigateDate('next')}
          onToday={() => store.initGame()}
          isLoading={store.isLoading}
        />

        {/* Image héro — plein écran */}
        <MovieImage
          uri={challenge.imageUrl}
          blurIndex={challenge.attemptsUsed}
          maxAttempts={challenge.maxAttempts}
          accentColor={accent.color}
          accentSoft={accent.soft}
          accentRing={accent.ring}
        />

        {/* Dots + compteur */}
        <View style={styles.dotsRow}>
          <AttemptTracker
            attempts={challenge.attempts}
            maxAttempts={challenge.maxAttempts}
            accentColor={accent.color}
            accentSoft={accent.soft}
          />
          <Text style={styles.counter}>
            {challenge.attemptsUsed}/{challenge.maxAttempts}
          </Text>
        </View>

        {/* Indices */}
        {challenge.hints.length > 0 && (
          <HintPanel
            hints={challenge.hints}
            hintsRevealed={challenge.hintsRevealed}
            maxAttempts={challenge.maxAttempts}
          />
        )}

        {/* Liste des tentatives passées */}
        <AttemptList attempts={challenge.attempts} />

        {/* Lien stats discret */}
        <Pressable
          onPress={() => { store.loadStats(); store.openModal('stats'); }}
          style={styles.statsLink}
        >
          <Text style={styles.statsLinkText}>Mes statistiques</Text>
        </Pressable>
      </ScrollView>

      {/* Input bar pinné en bas (glass) — masqué si partie terminée */}
      {!isOver && (
        <InputBar
          value={store.inputValue}
          onChangeText={handleChangeText}
          onSubmit={handleSubmit}
          onSkip={store.skipAttempt}
          suggestions={store.suggestions}
          isSuggestionsLoading={store.isSuggestionsLoading}
          isSubmitting={store.isSubmitting}
          disabled={isOver}
          shakeTrigger={store.shakeTrigger}
          placeholder={mediaType === 'series' ? 'Titre de la série…' : 'Titre du film…'}
          accentColor={accent.color}
          bottomInset={insets.bottom + 88} // espace pour le tab bar flottant
        />
      )}

      {/* Modals */}
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
        accentColor={accent.color}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // header
  header: {
    borderBottomWidth: 1,
  },
  headerInner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmark: { fontSize: 16, fontWeight: '700', color: colors.gold, letterSpacing: -0.2 },
  challengeNum: { fontSize: 11, color: colors.textFaint },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // mode tabs
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingBottom: 11,
    paddingTop: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  modeTabLabel: { fontSize: 13 },

  // scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },

  // date nav
  dateNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { padding: 8 },
  dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  dateLabel: { fontSize: 13, fontWeight: '500', color: colors.gold },
  returnToday: { fontSize: 11, color: colors.gold, marginLeft: 4 },

  // dots
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 11, color: colors.textFaint },

  // attempts
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
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  indexCorrect: { borderColor: `${colors.green}50`, backgroundColor: `${colors.green}18` },
  indexWrong:   { borderColor: `${colors.red}50`,   backgroundColor: `${colors.red}18` },
  indexSkip:    { borderColor: colors.borderStrong,  backgroundColor: 'transparent' },
  attemptIndexText: { fontSize: 10, fontWeight: '600' },
  attemptGuess: { flex: 1, fontSize: 13.5, color: colors.textDim },
  attemptTag: { fontSize: 12, color: colors.green },

  // stats link
  statsLink: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  statsLinkText: { fontSize: 12, color: colors.textFaint },

  // input bar (pinnée)
  inputBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputBar: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  inputFieldWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  devinerBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  devinerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // dropdown
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionTitle: { fontSize: 14, color: colors.text, flex: 1 },
  suggestionYear: { fontSize: 12, color: colors.textDim, marginLeft: 8 },

  // empty/loading
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  retryText: { fontSize: 14, color: colors.gold },
});
