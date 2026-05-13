import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle } from 'react-native-svg';
import { GlassView } from '../components/ui/GlassView';
import { EmailAuthModal } from '../components/auth/EmailAuthModal';
import { useAuthStore } from '../store/authStore';
import { colors, font, spacing, radius } from '../theme';

// ── Icônes SVG ────────────────────────────────────────────────────────────────
function FlameIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2c0 0-5 5-5 11a5 5 0 0 0 10 0C17 7 12 2 12 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SettingsIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={colors.textDim} strokeWidth="1.8" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={colors.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Onglet pill ───────────────────────────────────────────────────────────────
type StatMode = 'films' | 'series' | 'total';

function PillTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pillTab, active && styles.pillTabActive]}
    >
      <Text style={[styles.pillTabLabel, active && styles.pillTabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Distribution bar ──────────────────────────────────────────────────────────
const DIST_DATA = [
  { n: 1, pct: 12, count: 2 },
  { n: 2, pct: 45, count: 7 },
  { n: 3, pct: 100, count: 15 },
  { n: 4, pct: 56, count: 8 },
  { n: 5, pct: 28, count: 4 },
  { n: 6, pct: 18, count: 2 },
];

// ── ProfileScreen ─────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<StatMode>('films');
  const [authOpen, setAuthOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const barColor = mode === 'series' ? colors.series : mode === 'total' ? colors.gold : colors.films;

  const displayInitial =
    user?.displayName?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  const onSettingsPress = () => {
    if (user) {
      Alert.alert('Déconnexion', 'Se déconnecter de ce compte ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: () => void logout() },
      ]);
    } else {
      setAuthOpen(true);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <Pressable
          onPress={onSettingsPress}
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <SettingsIcon />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Identité */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{displayInitial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {user ? (
              <>
                <Text style={styles.userName} numberOfLines={1}>{user.displayName}</Text>
                <Text style={styles.userHandle} numberOfLines={1}>
                  {user.email ?? 'Compte GuessToday'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.userName}>Invité</Text>
                <Pressable onPress={() => setAuthOpen(true)} style={styles.connectChip}>
                  <Text style={styles.connectChipText}>Se connecter ou créer un compte</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Streak card */}
        <GlassView style={styles.streakCard} intensity={40} specular={false}>
          <View style={styles.streakIcon}>
            <FlameIcon color={colors.gold} size={22} />
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakSub}>Série en cours</Text>
            <Text style={styles.streakValue}>7 jours</Text>
          </View>
          <View style={styles.streakMax}>
            <Text style={styles.streakMaxLabel}>Max</Text>
            <Text style={styles.streakMaxValue}>14</Text>
          </View>
        </GlassView>

        {/* Mode tabs pill */}
        <View style={styles.pillTabs}>
          <PillTab label="Films"  active={mode === 'films'}  onPress={() => setMode('films')} />
          <PillTab label="Séries" active={mode === 'series'} onPress={() => setMode('series')} />
          <PillTab label="Total"  active={mode === 'total'}  onPress={() => setMode('total')} />
        </View>

        {/* Stat grid */}
        <View style={styles.statGrid}>
          <StatBox label="Joués"    value="42" />
          <StatBox label="Victoires" value="76%" />
          <StatBox label="Série"    value="7" />
          <StatBox label="Max"      value="14" />
        </View>

        {/* Distribution */}
        <Text style={styles.sectionLabel}>Distribution des victoires</Text>
        <View style={styles.distContainer}>
          {DIST_DATA.map(({ n, pct, count }) => (
            <View key={n} style={styles.distRow}>
              <Text style={styles.distN}>{n}</Text>
              <View style={styles.distBarBg}>
                <View style={[styles.distBar, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.distCount}>{count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <EmailAuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false);
          void fetchMe();
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  settingsBtn: {
    width: 36, height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },

  // Identité
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 62, height: 62,
    borderRadius: 31,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a0f00',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
  userName: { fontSize: 19, fontWeight: '600', color: colors.text },
  userHandle: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  connectChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldRing,
  },
  connectChipText: { fontSize: 13, fontWeight: '600', color: colors.gold },

  // Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,166,74,0.25)',
  },
  streakIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(212,166,74,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: { flex: 1 },
  streakSub: { fontSize: 12.5, color: colors.textDim },
  streakValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: 2,
  },
  streakMax: { alignItems: 'flex-end' },
  streakMaxLabel: { fontSize: 11, color: colors.textFaint },
  streakMaxValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  // Pill tabs
  pillTabs: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  pillTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  pillTabActive: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillTabLabel: { fontSize: 12.5, fontWeight: '500', color: colors.textDim },
  pillTabLabelActive: { fontWeight: '600', color: colors.text },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 9.5,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Distribution
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  distContainer: { gap: 5 },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distN: { fontSize: 12, color: colors.textFaint, width: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  distBarBg: {
    flex: 1,
    height: 18,
    backgroundColor: colors.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBar: { height: '100%', borderRadius: 4 },
  distCount: { fontSize: 11, color: colors.textDim, width: 20, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
