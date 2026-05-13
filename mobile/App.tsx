import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Rect, Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GameScreen } from './src/screens/GameScreen';
import { WikiScreen } from './src/screens/WikiScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SplashScreen, OnboardingScreen } from './src/screens/OnboardingScreen';
import { GlassView } from './src/components/ui/GlassView';
import {
  GlassContainer,
  GlassView as NativeGlassView,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { useGameStore } from './src/store/gameStore';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/theme';

// ── Icônes SVG ────────────────────────────────────────────────────────────────
const FilmIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 9h18M3 15h18M8 4v16M16 4v16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const TvIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 3l4 3 4-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
// Icône "livre ouvert" pour Wiki
const WikiIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const UsersIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const UserIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
  </Svg>
);

// ── Config des onglets ────────────────────────────────────────────────────────
export type TabId = 'films' | 'series' | 'wiki' | 'friends' | 'profile';

const TABS: { id: TabId; label: string; color: string; soft: string }[] = [
  { id: 'films',   label: 'Films',  color: colors.films,  soft: colors.filmsSoft  },
  { id: 'series',  label: 'Séries', color: colors.series, soft: colors.seriesSoft },
  { id: 'wiki',    label: 'Wiki',   color: colors.wiki,   soft: colors.wikiSoft   },
  { id: 'friends', label: 'Amis',   color: colors.gold,   soft: colors.goldSoft   },
  { id: 'profile', label: 'Profil', color: colors.gold,   soft: colors.goldSoft   },
];

function TabIcon({ id, color, size = 21 }: { id: TabId; color: string; size?: number }) {
  if (id === 'films')   return <FilmIcon  color={color} size={size} />;
  if (id === 'series')  return <TvIcon    color={color} size={size} />;
  if (id === 'wiki')    return <WikiIcon  color={color} size={size} />;
  if (id === 'friends') return <UsersIcon color={color} size={size} />;
  return                       <UserIcon  color={color} size={size} />;
}

// ── Tab bar Liquid Glass flottante ────────────────────────────────────────────
function FloatingTabBar({ active, onPress }: { active: TabId; onPress: (id: TabId) => void }) {
  const insets = useSafeAreaInsets();
  const nativeGlass = isGlassEffectAPIAvailable();

  const tabItems = TABS.map(({ id, label, color, soft }) => {
    const isActive = id === active;
    return (
      <Pressable
        key={id}
        onPress={() => onPress(id)}
        style={({ pressed }) => [
          styles.tabItem,
          styles.tabItemInner,
          isActive && { backgroundColor: soft },
          pressed && { opacity: 0.7 },
        ]}
      >
        <TabIcon id={id} color={isActive ? color : colors.textFaint} size={21} />
        <Text style={[
          styles.tabLabel,
          { color: isActive ? color : colors.textFaint },
          isActive && styles.tabLabelActive,
        ]}>
          {label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View
      style={[styles.tabBarOuter, { bottom: Math.max(insets.bottom + 6, 16) }]}
      pointerEvents="box-none"
    >
      {nativeGlass ? (
        /* iOS 26 — vrai Liquid Glass via GlassContainer (effet de fusion natif) */
        <GlassContainer spacing={4} style={styles.tabBarPill}>
          {TABS.map(({ id, label, color }) => {
            const isActive = id === active;
            const tab = TABS.find(t => t.id === id)!;
            return (
              <NativeGlassView
                key={id}
                glassEffectStyle={isActive ? 'regular' : 'clear'}
                colorScheme="dark"
                tintColor={isActive ? tab.color : undefined}
                isInteractive
                style={styles.tabItem}
              >
                <Pressable
                  onPress={() => onPress(id)}
                  style={({ pressed }) => [styles.tabItemInner, pressed && { opacity: 0.7 }]}
                >
                  <TabIcon id={id} color={isActive ? color : colors.textFaint} size={21} />
                  <Text style={[
                    styles.tabLabel,
                    { color: isActive ? color : colors.textFaint },
                    isActive && styles.tabLabelActive,
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              </NativeGlassView>
            );
          })}
        </GlassContainer>
      ) : (
        /* Fallback iOS < 26 / Android — BlurView simulé */
        <GlassView style={styles.tabBarPill} intensity={95} specular>
          <View style={styles.tabBarBorder} pointerEvents="none" />
          {tabItems}
        </GlassView>
      )}
    </View>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('films');
  const gameStore = useGameStore();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const handleTabPress = (id: TabId) => {
    setActiveTab(id);
    if (id === 'films')  gameStore.setMediaType('film');
    if (id === 'series') gameStore.setMediaType('series');
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {(activeTab === 'films' || activeTab === 'series') && <GameScreen />}
        {activeTab === 'wiki'    && <WikiScreen />}
        {activeTab === 'friends' && <FriendsScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>
      <FloatingTabBar active={activeTab} onPress={handleTabPress} />
    </View>
  );
}

const ONBOARDING_KEY = 'showguessr:onboarding_done';

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'onboarding' | 'app'>('splash');

  useEffect(() => {
    // Splash 1.5s puis vérifie si onboarding déjà vu
    const timer = setTimeout(async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      setAppState(done ? 'app' : 'onboarding');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setAppState('app');
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {appState === 'splash'     && <SplashScreen />}
      {appState === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      {appState === 'app'        && <AppContent />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },

  tabBarOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarPill: {
    flexDirection: 'row',
    borderRadius: 32,
    paddingVertical: 5,
    paddingHorizontal: 6,
    gap: 2,
    // Ombre portée iOS 26
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 20,
  },
  // Contour "verre" appliqué par-dessus le BlurView
  tabBarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    zIndex: 5,
  },
  tabItem: {
    borderRadius: 26,
    minWidth: 52,
    overflow: 'hidden',
  },
  tabItemInner: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
    fontWeight: '400',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
