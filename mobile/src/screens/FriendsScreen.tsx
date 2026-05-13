import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { colors, font, spacing, radius, accentFor } from '../theme';

// ── Icônes SVG ────────────────────────────────────────────────────────────────
function FilmIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 9h18M3 15h18M8 4v16M16 4v16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function TvIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 3l4 3 4-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
function FlameIcon({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2c0 0-5 5-5 11a5 5 0 0 0 10 0C17 7 12 2 12 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Données mock ──────────────────────────────────────────────────────────────
const FRIENDS = [
  { name: 'Marc',  handle: '@marc',  score: '2/6', rank: 1,    streak: 12, time: '08:14', pending: false, self: false },
  { name: 'Toi',   handle: '@moi',   score: '3/6', rank: 2,    streak: 7,  time: '09:02', pending: false, self: true  },
  { name: 'Léa',   handle: '@lea',   score: '4/6', rank: 3,    streak: 3,  time: '12:33', pending: false, self: false },
  { name: 'Sami',  handle: '@sami',  score: '4/6', rank: 4,    streak: 21, time: '13:07', pending: false, self: false },
  { name: 'Anna',  handle: '@anna',  score: '—',   rank: null, streak: 5,  time: null,    pending: true,  self: false },
  { name: 'Jules', handle: '@jules', score: '—',   rank: null, streak: 0,  time: null,    pending: true,  self: false },
];

type Mode = 'film' | 'series';

// ── Mode tab ──────────────────────────────────────────────────────────────────
function ModeTab({ Icon, label, active, color, onPress }: {
  Icon: (props: { color: string }) => React.ReactElement;
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && { borderBottomColor: color }]}>
      <Icon color={active ? color : colors.textFaint} />
      <Text style={[styles.modeTabLabel, { color: active ? color : colors.textFaint, fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Friend card ───────────────────────────────────────────────────────────────
function FriendCard({ f }: { f: typeof FRIENDS[0] }) {
  const isTop = f.rank === 1;
  return (
    <View style={[
      styles.friendCard,
      f.self  && { backgroundColor: colors.goldSoft, borderColor: colors.goldRing },
      f.pending && { opacity: 0.6 },
    ]}>
      <View style={[
        styles.rankBadge,
        isTop            ? { backgroundColor: colors.gold }    :
        f.rank           ? { backgroundColor: colors.surface } :
                           { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: colors.borderStrong },
      ]}>
        <Text style={[styles.rankText, isTop && { color: '#1a0f00' }]}>{f.rank ?? '—'}</Text>
      </View>

      <View style={styles.friendInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.friendName, f.self && { fontWeight: '600' }]}>{f.name}</Text>
          {f.self && <Text style={styles.selfTag}>· toi</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
          {f.streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FlameIcon color="#e08570" />
              <Text style={styles.friendMeta}>{f.streak}</Text>
            </View>
          )}
          {f.time    && <Text style={styles.friendMeta}>· {f.time}</Text>}
          {f.pending && <Text style={styles.friendMeta}>En attente</Text>}
        </View>
      </View>

      {!f.pending ? (
        <Text style={[styles.friendScore, isTop && { color: colors.gold }]}>{f.score}</Text>
      ) : (
        <Pressable style={({ pressed }) => [styles.relancerBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.relancerLabel}>Relancer</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── FriendsScreen ─────────────────────────────────────────────────────────────
export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('film');
  const accent = accentFor(mode);

  const ranked  = FRIENDS.filter(f => !f.pending);
  const pending = FRIENDS.filter(f =>  f.pending);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Amis</Text>
          <Pressable style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.8 }]}>
            <PlusIcon color={colors.gold} />
            <Text style={styles.inviteLabel}>Inviter</Text>
          </Pressable>
        </View>
        <View style={styles.modeTabs}>
          <ModeTab Icon={FilmIcon}  label="Films"  active={mode === 'film'}   color={colors.films}  onPress={() => setMode('film')} />
          <ModeTab Icon={TvIcon}    label="Séries" active={mode === 'series'} color={colors.series} onPress={() => setMode('series')} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Défi du jour */}
        <View style={[styles.challengeBanner, { backgroundColor: accent.soft, borderColor: accent.ring }]}>
          <View style={[styles.challengeIcon, { backgroundColor: accent.color }]}>
            {mode === 'series' ? <TvIcon color="#fff" /> : <FilmIcon color="#fff" />}
          </View>
          <View style={styles.challengeInfo}>
            <Text style={[styles.challengeMode, { color: accent.color }]}>
              {mode === 'series' ? 'Série du jour' : 'Film du jour'}
            </Text>
            <Text style={styles.challengeSubtitle}>4 amis ont déjà joué</Text>
          </View>
          <Pressable style={[styles.jouerBtn, { backgroundColor: accent.color }]}>
            <Text style={styles.jouerLabel}>Jouer</Text>
          </Pressable>
        </View>

        {/* Classement */}
        <Text style={styles.sectionLabel}>Classement du jour</Text>
        <View style={styles.list}>
          {ranked.map(f => <FriendCard key={f.handle} f={f} />)}
        </View>

        {pending.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>En attente</Text>
            <View style={styles.list}>
              {pending.map(f => <FriendCard key={f.handle} f={f} />)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(212,166,74,0.25)',
  },
  inviteLabel: { fontSize: 13, fontWeight: '600', color: colors.gold },

  modeTabs: { flexDirection: 'row' },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  modeTabLabel: { fontSize: 13 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },

  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  challengeIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: { flex: 1 },
  challengeMode: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  challengeSubtitle: { fontSize: 13, color: colors.text, marginTop: 1 },
  jouerBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  jouerLabel: { fontSize: 12.5, fontWeight: '600', color: colors.white },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  list: { gap: 6 },

  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.textDim },
  friendInfo: { flex: 1, minWidth: 0 },
  friendName: { fontSize: 14, fontWeight: '500', color: colors.text },
  selfTag: { fontSize: 11, color: colors.gold, fontWeight: '500' },
  friendMeta: { fontSize: 11, color: colors.textFaint },
  friendScore: { fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  relancerBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  relancerLabel: { fontSize: 11, fontWeight: '500', color: colors.textDim },
});
