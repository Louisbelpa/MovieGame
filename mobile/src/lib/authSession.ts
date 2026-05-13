import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'guesstoday:user_session_token';

export async function getUserSessionToken(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function setUserSessionToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export async function clearUserSessionToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
