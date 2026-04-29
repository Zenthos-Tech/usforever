import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'USFOREVER_AUTH_TOKEN_V1';
// SecureStore keys must match /^[A-Za-z0-9._-]+$/ — the AsyncStorage key already
// satisfies that constraint, so we reuse it verbatim on native too.
const SECURE_KEY = AUTH_TOKEN_KEY;

// SecureStore is unavailable on web; fall back to AsyncStorage there.
const useSecure = Platform.OS !== 'web';

let migrated = false;

async function migrateFromAsyncStorageIfNeeded() {
  if (migrated || !useSecure) {
    migrated = true;
    return;
  }
  try {
    const existing = await SecureStore.getItemAsync(SECURE_KEY);
    if (!existing) {
      const legacy = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (legacy) {
        await SecureStore.setItemAsync(SECURE_KEY, legacy);
      }
    }
    // One-shot: drop the AsyncStorage copy so we don't keep a plaintext JWT
    // sitting on disk after the migration.
    try { await AsyncStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
  } catch (_) {
    // Swallow — getAuthToken will return null and the caller will redirect to
    // verify, which is the correct fallback when secure storage is unhappy.
  } finally {
    migrated = true;
  }
}

export async function getAuthToken() {
  await migrateFromAsyncStorageIfNeeded();
  try {
    if (useSecure) {
      return await SecureStore.getItemAsync(SECURE_KEY);
    }
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

export async function setAuthToken(token) {
  if (!token) {
    await clearAuthToken();
    return;
  }
  try {
    if (useSecure) {
      await SecureStore.setItemAsync(SECURE_KEY, String(token));
    } else {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, String(token));
    }
  } catch (_) {
    // Best-effort: a failed write means the user will be re-prompted to log in.
  }
}

export async function clearAuthToken() {
  try {
    if (useSecure) {
      await SecureStore.deleteItemAsync(SECURE_KEY);
    }
  } catch (_) {}
  try { await AsyncStorage.removeItem(AUTH_TOKEN_KEY); } catch (_) {}
}

export { AUTH_TOKEN_KEY };
