import * as FileSystem from 'expo-file-system/legacy';

export const isHttpUri = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
export const isFileUri = (u) => typeof u === 'string' && /^file:\/\//i.test(u);
export const isContentUri = (u) => typeof u === 'string' && /^content:\/\//i.test(u);

export const safeNameFromUrl = (url) => {
  const noQuery = (url || '').split('?')[0];
  const last = noQuery.split('/').pop() || `photo_${Date.now()}.jpg`;
  const clean = last.replace(/[^a-zA-Z0-9._-]/g, '_');
  const hasExt = /\.[a-zA-Z0-9]+$/.test(clean);
  return hasExt ? clean : `${clean}.jpg`;
};

export const guessMime = (nameOrUrl) => {
  const s = String(nameOrUrl || '').toLowerCase();
  if (s.endsWith('.png')) return 'image/png';
  if (s.endsWith('.webp')) return 'image/webp';
  if (s.endsWith('.heic') || s.endsWith('.heif')) return 'image/heic';
  if (s.endsWith('.mp4')) return 'video/mp4';
  if (s.endsWith('.mov')) return 'video/quicktime';
  if (s.endsWith('.m4v')) return 'video/x-m4v';
  return 'image/jpeg';
};

export const ensureLocalFileUri = async (inputUri) => {
  const u = String(inputUri || '').trim();
  if (!u) throw new Error('Missing image url');

  if (isFileUri(u)) return u;

  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) throw new Error('No cache directory');

  if (isHttpUri(u)) {
    const fileName = safeNameFromUrl(u);
    const localPath = baseDir + fileName;
    await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    const res = await FileSystem.downloadAsync(u, localPath);
    return res?.uri || localPath;
  }

  if (isContentUri(u)) {
    const fileName = `share_${Date.now()}.jpg`;
    const localPath = baseDir + fileName;
    await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    await FileSystem.copyAsync({ from: u, to: localPath });
    return localPath;
  }

  const localPath = baseDir + `share_${Date.now()}.jpg`;
  await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
  await FileSystem.copyAsync({ from: u, to: localPath });
  return localPath;
};
