// Per-user storage budget helpers, shared between DynamicGallery and the
// AlbumFooterBar / create-album storage flows. The remaining-bytes counter
// is namespaced by phone so logging in as a different couple on the same
// device doesn't carry budget over.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_REMAINING_KEY = 'USFOREVER_STORAGE_REMAINING_BYTES_V1';
export const DEFAULT_STORAGE_LIMIT_BYTES = 300 * 1024 * 1024 * 1024;

const clamp0 = (n) => Math.max(0, Number(n || 0) || 0);

export function makePerUserStorageKey(baseKey, phoneNumber) {
  const safePhone = String(phoneNumber || '').trim();
  if (!safePhone) return String(baseKey);
  return `${String(baseKey)}_${safePhone}`;
}

export async function getRemainingBytes(phone) {
  try {
    const key = makePerUserStorageKey(STORAGE_REMAINING_KEY, phone);
    const raw = await AsyncStorage.getItem(key);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return clamp0(parsed);
  } catch {}
  return DEFAULT_STORAGE_LIMIT_BYTES;
}

export async function setRemainingBytes(next, phone) {
  try {
    const key = makePerUserStorageKey(STORAGE_REMAINING_KEY, phone);
    await AsyncStorage.setItem(key, String(clamp0(next)));
  } catch {}
}

export async function consumeBytes(bytes, phone) {
  const delta = clamp0(bytes);
  if (delta <= 0) return;
  const cur = await getRemainingBytes(phone);
  await setRemainingBytes(Math.max(0, cur - delta), phone);
}

export async function refundBytes(bytes, phone) {
  const delta = clamp0(bytes);
  if (delta <= 0) return;
  const cur = await getRemainingBytes(phone);
  await setRemainingBytes(cur + delta, phone);
}
