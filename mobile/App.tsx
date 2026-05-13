import 'react-native-reanimated';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameScreen } from './src/screens/GameScreen';
import { WikiScreen } from './src/screens/WikiScreen';
import { useGameStore } from './src/store/gameStore';
import { FEATURES, BRAND_NAME } from './src/config/features';
import { colors, spacing, font } from './src/theme';

const Tab = createBottomTabNavigator();

function Header({ title, mediaType }: { title: string; mediaType?: string }) {
  const insets = useSafeAreaInsets();
  const store = useGameStore();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.headerTitle}>{title}</Text>
      {FEATURES.enableSeries && mediaType !== 'wiki' && (
        <View style={styles.modeTabs}>
          <Pressable
            onPress={() => store.setMediaType('film')}
            style={({ pressed }) => [
              styles.modeTab,
              store.mediaType === 'film' && styles.modeTabActive,
              pressed && styles.modeTabPressed,
            ]}
          >
            <Text style={[styles.modeTabText, store.mediaType === 'film' && styles.modeTabTextActive]}>
              Films
            </Text>
          </Pressable>
          <Pressable
            onPress={() => store.setMediaType('series')}
            style={({ pressed }) => [
              styles.modeTab,
              store.mediaType === 'series' && styles.modeTabActive,
              pressed && styles.modeTabPressed,
            ]}
          >
            <Text style={[styles.modeTabText, store.mediaType === 'series' && styles.modeTabTextActive]}>
              Séries
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function FilmTabScreen() {
  return (
    <View style={styles.screen}>
      <Header title={BRAND_NAME} mediaType="film" />
      <GameScreen />
    </View>
  );
}

function WikiTabScreen() {
  return (
    <View style={styles.screen}>
      <Header title="WikiGuessr" mediaType="wiki" />
      <WikiScreen />
    </View>
  );
}

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Film"
        component={FilmTabScreen}
        options={{
          tabBarLabel: 'Films',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film-outline" size={size} color={color} />
          ),
        }}
      />
      {FEATURES.enableWiki && (
        <Tab.Screen
          name="Wiki"
          component={WikiTabScreen}
          options={{
            tabBarLabel: 'WikiGuessr',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="globe-outline" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: font.xl,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: 8,
    padding: 2,
  },
  modeTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: 6,
  },
  modeTabActive: { backgroundColor: colors.gold },
  modeTabPressed: { opacity: 0.7 },
  modeTabText: { fontSize: font.base, color: colors.textDim, fontWeight: '600' },
  modeTabTextActive: { color: colors.bg },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabLabel: { fontSize: 11 },
});
