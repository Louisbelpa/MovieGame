import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedGameState, PersonalStats } from '../types';

const PREFIX = 'guesstoday:';

async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {}
}

export const gameStorage = {
  getState: (type: string) => get<PersistedGameState>(`gameState:${type}`),
  setState: (type: string, state: PersistedGameState) => set(`gameState:${type}`, state),

  getStats: (type: string) => get<PersonalStats>(`stats:${type}`),
  setStats: (type: string, stats: PersonalStats) => set(`stats:${type}`, stats),

  getRulesSeen: (type: string) => get<boolean>(`rules_seen:${type}`),
  setRulesSeen: (type: string) => set(`rules_seen:${type}`, true),

  clear: () => remove,
};
