

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AlbumHeader from '../components/Albumheader';
import Colors from '../theme/colors';

import { useImages } from '../context/ImagesContext';
import { useWedding } from '../context/WeddingContext';

import PlusIcon from '../assets/images/UPLOADIMAGES.svg'; // or correct path
import { useTvConnection } from '../hooks/useTvConnection';
import { API_URL } from '../utils/api';
import ConnectToTVModal from './ConnectToTVModal';
import ConnectionSuccessModal from './ConnectionSuccessModal';
// ✅ SVG icons
import BackIconSvg from '../assets/images/Back icon.svg';
import ShareIconSvg from '../assets/images/Share.svg';
import DeleteIconSvg from '../assets/images/Trash.svg';
import TickIconSvg from '../assets/images/Vector.svg';
import FavouriteIconSvg from '../assets/images/selected.svg';
import CloseIconSvg from '../assets/images/untick.svg';

// ✅ New facial recognition icon
import FacialRecognitionIconSvg from '../assets/images/facial-recognition.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const isNumericId = (v) => {
  const s = String(v || '').trim();
  return s.length > 0 && s !== 'undefined' && s !== 'null';
};

// =========================
// ✅ Dynamic Storage helpers (shared with AlbumFooterBar)
// =========================
const STORAGE_REMAINING_KEY = 'USFOREVER_STORAGE_REMAINING_BYTES_V1';
const DEFAULT_STORAGE_LIMIT_BYTES = 300 * 1024 * 1024 * 1024;

const clamp0 = (n) => Math.max(0, Number(n || 0) || 0);

function makePerUserStorageKey(baseKey, phoneNumber) {
  const safePhone = String(phoneNumber || '').trim();
  if (!safePhone) return String(baseKey);
  return `${String(baseKey)}_${safePhone}`;
}

async function getRemainingBytes(phone) {
  try {
    const key = makePerUserStorageKey(STORAGE_REMAINING_KEY, phone);
    const raw = await AsyncStorage.getItem(key);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return clamp0(parsed);
  } catch {}
  return DEFAULT_STORAGE_LIMIT_BYTES;
}

async function setRemainingBytes(next, phone) {
  try {
    const key = makePerUserStorageKey(STORAGE_REMAINING_KEY, phone);
    await AsyncStorage.setItem(key, String(clamp0(next)));
  } catch {}
}

async function consumeBytes(bytes, phone) {
  const delta = clamp0(bytes);
  if (delta <= 0) return;
  const cur = await getRemainingBytes(phone);
  await setRemainingBytes(Math.max(0, cur - delta), phone);
}

async function refundBytes(bytes, phone) {
  const delta = clamp0(bytes);
  if (delta <= 0) return;
  const cur = await getRemainingBytes(phone);
  await setRemainingBytes(cur + delta, phone);
}

const readSizeBytesFromItem = (item) => {
  const b = Number(item?.sizeBytes ?? item?.size_bytes ?? 0) || 0;
  return clamp0(b);
};
// =========================

function getApiBase() {
  const base = String(API_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('Missing API_URL');
  if (base.endsWith('/api')) return base;
  return `${base}/api`;
}

async function apiFetch(path, options) {
  const baseApi = getApiBase();
  const p = String(path || '').startsWith('/') ? String(path) : `/${String(path)}`;
  const url = `${baseApi}${p}`;

  const res = await fetch(url, options);
  const raw = await res.text();

  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!res.ok) return { ok: false, url, status: res.status, body: json ?? raw };
  return { ok: true, url, status: res.status, json: json ?? raw };
}

async function rawFetchAbsolute(url, options) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!res.ok) return { ok: false, url, status: res.status, body: json ?? raw };
  return { ok: true, url, status: res.status, json: json ?? raw };
}

function getExtFromUri(uri) {
  const clean = String(uri || '').split('?')[0];
  const m = clean.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] || 'jpg').toLowerCase();
}

function mimeFromExt(ext) {
  const e = String(ext || '').toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'heic' || e === 'heif') return 'image/heic';

  if (e === 'mp4') return 'video/mp4';
  if (e === 'mov') return 'video/quicktime';
  if (e === 'm4v') return 'video/x-m4v';

  return 'image/jpeg';
}

async function uriToBlob(uri) {
  const res = await fetch(uri);
  return await res.blob();
}

// =========================
// ✅ Preview-style share helpers
// =========================
const isHttpUri = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const isFileUri = (u) => typeof u === 'string' && /^file:\/\//i.test(u);
const isContentUri = (u) => typeof u === 'string' && /^content:\/\//i.test(u);

const joinUrl = (base, path) => {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  if (!b) return `/${p}`;
  return `${b}/${p}`;
};

const getRawUri = (item) =>
  item?.uri ||
  item?.url ||
  item?.imageUrl ||
  item?.src ||
  item?.image_url ||
  item?.imageUrlKey ||
  item?.key ||
  item?.path ||
  '';

const resolveDisplayUri = (raw) => {
  const u = String(raw || '').trim();
  if (!u) return '';
  if (isHttpUri(u) || isFileUri(u) || isContentUri(u) || u.includes('://')) return u;
  return joinUrl(API_URL, u);
};

const safeNameFromUrl = (url) => {
  const noQuery = (url || '').split('?')[0];
  const last = noQuery.split('/').pop() || `photo_${Date.now()}.jpg`;
  const clean = last.replace(/[^a-zA-Z0-9._-]/g, '_');
  const hasExt = /\.[a-zA-Z0-9]+$/.test(clean);
  return hasExt ? clean : `${clean}.jpg`;
};

const guessMime = (nameOrUrl) => {
  const s = String(nameOrUrl || '').toLowerCase();
  if (s.endsWith('.png')) return 'image/png';
  if (s.endsWith('.webp')) return 'image/webp';
  if (s.endsWith('.heic') || s.endsWith('.heif')) return 'image/heic';
  if (s.endsWith('.mp4')) return 'video/mp4';
  if (s.endsWith('.mov')) return 'video/quicktime';
  if (s.endsWith('.m4v')) return 'video/x-m4v';
  return 'image/jpeg';
};

const ensureLocalFileUri = async (inputUri) => {
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
// =========================

const holdGlassBoxStyle = () => ({
  backgroundColor: '#FFFFFFC4',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.55)',
});

const BAR_BG = '#FFFFFFBD';
const themePrimary = () => Colors?.primary ?? Colors?.primaryPink ?? '#E85A70';
const HEART_RED = '#E53935';

function SvgIcon({ Icon, size, tint }) {
  return (
    <Icon
      width={size}
      height={size}
      fill={tint}
      stroke={tint}
      color={tint}
    />
  );
}

function Action({ icon, label, onPress, textSize, danger }) {
  return (
    <TouchableOpacity style={modalStyles.actionItem} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text
        style={[
          modalStyles.actionText,
          {
            fontSize: textSize,
            color: danger ? (Colors?.danger ?? '#c00') : (Colors?.textSecondary ?? '#666'),
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DynamicImageHoldModal({
  visible,
  image,
  onClose,
  canShare,
  canDelete,
  canFavourite = true,
  onToggleFavourite,
  isFavourited,
}) {
  const { width: W, height: H } = useWindowDimensions();
  const short = Math.min(W, H);
  const gutter = useMemo(() => clamp(short * 0.06, 14, 24), [short]);

  const cardW = useMemo(() => clamp(W - gutter * 3.4, 220, 300), [W, gutter]);

  const radius = 16;

  const imgBoxH = useMemo(() => clamp(H * 0.38, 200, H * 0.44), [H]);
  const actionsBoxH = useMemo(() => clamp(H * 0.075, 50, 70), [H]);
  const gap = useMemo(() => clamp(gutter * 0.25, 6, 10), [gutter]);

  const icon = useMemo(() => clamp(W * 0.06, 20, 26), [W]);
  const text = useMemo(() => clamp(W * 0.022, 8, 10), [W]);

  const [measured, setMeasured] = useState({ w: 1, h: 1 });

  React.useEffect(() => {
    if (!visible || !image?.uri) return;

    let alive = true;
    Image.getSize(
      image.uri,
      (w, h) => {
        if (!alive) return;
        setMeasured({ w: Math.max(1, w), h: Math.max(1, h) });
      },
      () => {
        if (!alive) return;
        setMeasured({ w: 1, h: 1 });
      }
    );

    return () => {
      alive = false;
    };
  }, [visible, image?.uri]);

  const fitted = useMemo(() => {
    const mw = Math.max(1, Number(measured.w || 1));
    const mh = Math.max(1, Number(measured.h || 1));
    const scale = Math.min(cardW / mw, imgBoxH / mh);
    return {
      w: Math.max(1, Math.floor(mw * scale)),
      h: Math.max(1, Math.floor(mh * scale)),
    };
  }, [measured, cardW, imgBoxH]);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (!visible || !image) return null;

  const handleShare = async () => {
    if (!canShare) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }

      const fileUri = await ensureLocalFileUri(image.uri);
      const mimeType = guessMime(fileUri);
      await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Share photo' });
    } catch (e) {
      console.log('Share error:', e);
      Alert.alert('Share failed', String(e?.message || e || 'Could not share this photo.'));
    }
  };

  const requestDelete = () => {
    if (!canDelete) return;
    setConfirmDeleteOpen(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose?.({ action: 'close' })}
    >
      <Pressable
        style={[modalStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={() => {
          setConfirmDeleteOpen(false);
          onClose?.({ action: 'close' });
        }}
      >
        <Pressable style={{ width: cardW, alignItems: 'center' }} onPress={() => {}}>
          <View style={{ width: cardW, alignItems: 'center' }}>
            <View style={{ width: cardW, alignItems: 'center' }}>
              <View
                style={[
                  modalStyles.imageShadow,
                  {
                    width: cardW,
                    height: imgBoxH,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    borderRadius: radius,
                  },
                ]}
              >
                <Image
                  source={{ uri: image.uri }}
                  resizeMode="contain"
                  style={{
                    width: fitted.w,
                    height: fitted.h,
                    borderRadius: radius,
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            </View>

            <View style={{ height: gap }} />

            <View
              style={[
                modalStyles.box,
                {
                  width: cardW * 0.88,
                  height: actionsBoxH,
                  borderRadius: radius,
                  overflow: 'hidden',
                },
                holdGlassBoxStyle(),
              ]}
            >
              <View style={modalStyles.actionBar}>
                {canShare ? (
                  <Action
                    label="Share"
                    onPress={handleShare}
                    icon={<SvgIcon Icon={ShareIconSvg} size={icon} tint={Colors?.textPrimary ?? '#111'} />}
                    textSize={text}
                  />
                ) : null}

                {canFavourite ? (
                  <Action
                    label="Favourite"
                    onPress={() => onToggleFavourite?.(image)}
                    icon={
                      <SvgIcon
                        Icon={FavouriteIconSvg}
                        size={icon}
                        tint={isFavourited ? HEART_RED : (Colors?.textPrimary ?? '#111')}
                      />
                    }
                    textSize={text}
                  />
                ) : null}

                {canDelete ? (
                  <Action
                    label="Delete"
                    onPress={requestDelete}
                    icon={<SvgIcon Icon={DeleteIconSvg} size={icon} tint={Colors?.danger ?? '#c00'} />}
                    textSize={text}
                    danger
                  />
                ) : null}
              </View>
            </View>

            {confirmDeleteOpen ? (
              <Pressable
                style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
                onPress={() => setConfirmDeleteOpen(false)}
              >
                <Pressable
                  onPress={() => {}}
                  style={[
                    modalStyles.confirmCard,
                    { width: cardW, borderRadius: radius, backgroundColor: Colors?.background ?? '#fff' },
                  ]}
                >
                  <BlurView tint="light" intensity={28} style={StyleSheet.absoluteFill} />
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFFC4' }]} />

                  <Text style={[modalStyles.confirmTitle, { color: Colors?.textPrimary ?? '#111' }]}>
                    Delete Image
                  </Text>
                  <Text style={[modalStyles.confirmBody, { color: Colors?.textSecondary ?? '#666' }]}>
                    Are you sure you want to delete this image?
                  </Text>

                  <View style={modalStyles.confirmRow}>
                    <TouchableOpacity
                      onPress={() => setConfirmDeleteOpen(false)}
                      activeOpacity={0.85}
                      style={modalStyles.confirmBtn}
                    >
                      <Text style={[modalStyles.confirmBtnText, { color: themePrimary() }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setConfirmDeleteOpen(false);
                        onClose?.({ action: 'delete', id: image.id });
                      }}
                      activeOpacity={0.85}
                      style={modalStyles.confirmBtn}
                    >
                      <Text style={[modalStyles.confirmBtnText, { color: themePrimary() }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DynamicGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const { weddingData, getDefaultAlbumId } = useWedding();

  const userPhoneNumber = useMemo(
    () =>
      String(
        weddingData?.phone ||
          weddingData?.phoneNumber ||
          weddingData?.mobile ||
          weddingData?.userPhone ||
          ''
      ).trim(),
    [weddingData]
  );

  const {
    role: roleFromCtx,
    readOnly,
    images,
    setAlbumScope,
    syncFromDeepLink,
    refreshActiveAlbum,
    setSelectedImage,
    removeImage,
    addOptimisticImage,
    pruneOptimistic,

    getSelectedByEvent,
    addToSelected,
    toggleSelected,
    saveToSelected,
    moveToSelected,

    fetchPhotosPage,
    loadMorePhotos,
    getPhotoPagination,
  } = useImages();

  const params = useLocalSearchParams();
  const folderName = String(params?.folderName || '').trim();
  const routeAlbumId = String(params?.albumId || '').trim();
  const deepSlug = String(params?.slug || '').trim();
  const deepToken = String(params?.t || '').trim();
  const deepAccessToken = String(params?.accessToken || '').trim();
  const deepWeddingId = String(params?.weddingId || '').trim();
  const roleParam = String(params?.role || '').toLowerCase().trim();
  const paramBrideName = String(params?.brideName || '').trim();
  const paramGroomName = String(params?.groomName || '').trim();
  const paramCoupleName = String(params?.coupleName || '').trim();
  const paramWeddingDate = String(params?.weddingDate || '').trim();
  const paramWeddingTitle = String(params?.weddingTitle || '').trim();

  const role = String(roleParam || roleFromCtx || '').toLowerCase().trim();
  const isCouple = role === 'couple';
  const isGuestDeepLink = role === 'guest' && !!deepSlug && !!deepToken;

  const canUpload = (role === 'couple' || role === 'photographer') && !readOnly;

  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [holdModalVisible, setHoldModalVisible] = useState(false);
  const [heldImage, setHeldImage] = useState(null);

  const tvWeddingId = useMemo(() => {
    // Guests pass weddingId via route params; couple gets it from weddingData context
    if (deepWeddingId) return deepWeddingId;
    const wd = weddingData || {};
    const v =
      wd?.weddingId ||
      wd?.id ||
      wd?._id ||
      wd?.wedding_id ||
      wd?.data?.weddingId ||
      wd?.data?.id ||
      null;
    const s = String(v || '').trim();
    return (!s || s === 'undefined' || s === 'null') ? '' : s;
  }, [weddingData, deepWeddingId]);

  const {
    tvConnected,
    showTVModal,
    showTVSuccess,
    setShowTVModal,
    setShowTVSuccess,
    onConnected: tvOnConnected,
    onDisconnect: tvOnDisconnect,
    onCastPress: tvOnCastPress,
  } = useTvConnection(tvWeddingId);
  const [metaAlbumId, setMetaAlbumId] = useState('');

  const [ensuringAlbum, setEnsuringAlbum] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const [localFavSet, setLocalFavSet] = useState(() => new Set());

  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const eventKey = useMemo(() => {
    const n = String(folderName || '').toLowerCase();
    if (n.includes('engag')) return 'Engagement';
    if (n.includes('wed')) return 'Wedding';
    return String(folderName || 'Wedding').trim() || 'Wedding';
  }, [folderName]);

  const effectiveAlbumId = useMemo(() => {
    if (isNumericId(routeAlbumId)) return String(routeAlbumId).trim();
    if (isNumericId(metaAlbumId)) return String(metaAlbumId).trim();

    const which = String(folderName || '').toLowerCase().includes('engag') ? 'engagement' : 'wedding';
    const fromCtx = getDefaultAlbumId?.(which);
    if (isNumericId(fromCtx)) return String(fromCtx).trim();
    return '';
  }, [routeAlbumId, metaAlbumId, folderName, getDefaultAlbumId]);

  const uploadAlbumId = useMemo(() => (isNumericId(effectiveAlbumId) ? String(effectiveAlbumId).trim() : ''), [
    effectiveAlbumId,
  ]);

  const syncRef = useRef(syncFromDeepLink);
  const refreshRef = useRef(refreshActiveAlbum);
  const setScopeRef = useRef(setAlbumScope);

  React.useEffect(() => {
    syncRef.current = syncFromDeepLink;
    refreshRef.current = refreshActiveAlbum;
    setScopeRef.current = setAlbumScope;
  }, [syncFromDeepLink, refreshActiveAlbum, setAlbumScope]);

  React.useEffect(() => {
    if (effectiveAlbumId) setScopeRef.current?.(effectiveAlbumId);
  }, [effectiveAlbumId]);


  const getWeddingIdForUpload = useCallback(() => {
    const wd = weddingData || {};
    const v =
      wd?.id ??
      wd?.weddingId ??
      wd?.wedding_id ??
      wd?.wedding?.id ??
      wd?.data?.id ??
      wd?.data?.weddingId ??
      wd?._id;
    const s = String(v ?? '').trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s;
  }, [weddingData]);

  const fetchPhotosForGuestShare = useCallback(async (albumIdOverride) => {
    const base = String(API_URL || '').replace(/\/+$/, '');
    if (!base) return { ok: false, reason: 'missing_api_url' };

    // Prefer Bearer JWT path — works for passcode-protected links without re-sending passcode
    if (deepAccessToken && albumIdOverride) {
      const url = `${base}/share/photos?albumId=${encodeURIComponent(albumIdOverride)}`;
      const r = await rawFetchAbsolute(url, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${deepAccessToken}` },
      });
      if (r?.ok) return r;
    }

    // Fallback: slug+t (works for non-passcode links)
    const albumSuffix = albumIdOverride ? `&albumId=${encodeURIComponent(albumIdOverride)}` : '';
    const url1 = `${base}/share/photos?slug=${encodeURIComponent(deepSlug)}&t=${encodeURIComponent(deepToken)}${albumSuffix}`;

    return await rawFetchAbsolute(url1, { method: 'GET', headers: { Accept: 'application/json' } });
  }, [deepSlug, deepToken, deepAccessToken]);


  const refreshNow = useCallback(async () => {
    setSyncing(true);
    try {
      if (isGuestDeepLink) {
        const albumToUse = effectiveAlbumId;
        if (!albumToUse) return { ok: false, reason: 'missing_albumId' };

        if (albumToUse) {
          setMetaAlbumId(albumToUse);
          setAlbumScope?.(albumToUse);
          setScopeRef.current?.(albumToUse);
        }

        // syncFromDeepLink handles JWT Bearer path + fallback, stores photos in context
        if (typeof syncRef.current === 'function') {
          const result = await syncRef.current({
            slug: deepSlug,
            token: deepToken,
            albumId: albumToUse,
            accessToken: deepAccessToken,
          });
          return result || { ok: true };
        }
        return { ok: true };
      }

      if (!effectiveAlbumId) return { ok: false, reason: 'missing_albumId' };

      const result = await fetchPhotosPage({ albumId: effectiveAlbumId, reset: true });
      return result || { ok: true };
    } finally {
      setSyncing(false);
    }
  }, [
    isGuestDeepLink,
    deepSlug,
    deepToken,
    deepAccessToken,
    effectiveAlbumId,
    fetchPhotosPage,
    setAlbumScope,
  ]);

  const initialFetchDone = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isGuestDeepLink) {
        if (!initialFetchDone.current) {
          initialFetchDone.current = true;
          refreshNow().catch((e) => console.log('focus sync error', e));
        }
      } else if (effectiveAlbumId && !initialFetchDone.current) {
        initialFetchDone.current = true;
        fetchPhotosPage({ albumId: effectiveAlbumId }).catch((e) =>
          console.log('initial fetch error', e)
        );
      }
      return () => {};
    }, [isGuestDeepLink, refreshNow, effectiveAlbumId])
  );

  const ensureNumericAlbumIdForUpload = useCallback(async () => {
    if (uploadAlbumId) return uploadAlbumId;
    if (!canUpload || isGuestDeepLink) return '';

    setEnsuringAlbum(true);
    try {
      const which = String(folderName || '').toLowerCase().includes('engag') ? 'engagement' : 'wedding';
      const fromCtx = getDefaultAlbumId?.(which);
      return isNumericId(fromCtx) ? String(fromCtx).trim() : '';
    } finally {
      setEnsuringAlbum(false);
    }
  }, [uploadAlbumId, canUpload, isGuestDeepLink, folderName, getDefaultAlbumId]);

  const short = Math.min(W, H);
  const gutter = useMemo(() => clamp(short * 0.06, 14, 24), [short]);

  const cols = 3;
  const gap = useMemo(() => clamp(gutter * 0.55, 10, 16), [gutter]);

  const tileW = useMemo(() => {
    const usable = W - gutter * 2;
    return (usable - gap * (cols - 1)) / cols;
  }, [W, gutter, gap]);

  const uploadCard = useMemo(() => clamp(W * 0.155, 58, 70), [W]);
  const uploadRadius = useMemo(() => clamp(uploadCard * 0.22, 12, 16), [uploadCard]);
  const uploadCircle = useMemo(() => clamp(W * 0.095, 30, 38), [W]);
  const uploadPlus = useMemo(() => clamp(uploadCircle * 0.62, 18, 24), [uploadCircle]);
  const uploadLabel = useMemo(() => clamp(W * 0.024, 8, 10), [W]);

  // ✅ new floating facial card sizes — same formula as create-album guest FAB
  const facialCard = useMemo(() => clamp(W * 0.22, 86, 112), [W]);
  const facialRadius = useMemo(() => clamp(facialCard * 0.22, 16, 22), [facialCard]);
  const facialCircle = useMemo(() => clamp(facialCard * 0.48, 40, 54), [facialCard]);
  const facialIconSize = useMemo(() => clamp(facialCircle * 0.46, 18, 24), [facialCircle]);
  const facialLabel = useMemo(() => clamp(W * 0.024, 8, 10), [W]);
  const floatingCardGap = useMemo(() => clamp(gutter * 0.55, 10, 14), [gutter]);

  const fabRight = useMemo(() => clamp(gutter * 0.9, 14, 22), [gutter]);
  const fabBottom = useMemo(() => insets.bottom + clamp(gutter * 0.55, 10, 16), [insets.bottom, gutter]);

  const displayImages = useMemo(() => (Array.isArray(images) ? images : []), [images]);

  const getItemKey = useCallback((item) => String(item?.id ?? item?.tmpId ?? item?.uri ?? item?.image_url ?? ''), []);
  const selectedSet = useMemo(() => new Set(selectedKeys.map(String)), [selectedKeys]);

  const deleteByIdWithRefund = useCallback(
    async (id) => {
      const sid = String(id ?? '').trim();
      if (!isNumericId(sid)) return;

      const item = displayImages.find((x) => String(x?.id ?? '') === sid);
      const bytes = readSizeBytesFromItem(item);

      await removeImage(sid, effectiveAlbumId);

      if (bytes > 0) await refundBytes(bytes, userPhoneNumber);
    },
    [displayImages, removeImage, effectiveAlbumId, userPhoneNumber]
  );

  const normalizeForSelected = useCallback((item) => {
    const normalized = {
      ...(item || {}),
      uri:
        item?.uri ||
        item?.url ||
        item?.imageUrl ||
        item?.src ||
        item?.image_url ||
        item?.imageUrlKey ||
        item?.key ||
        item?.path,
    };
    const u = resolveDisplayUri(getRawUri(normalized));
    return { ...normalized, uri: u };
  }, []);

  const addToSelectedFolder = useCallback(
    async (img) => {
      if (!img) return;

      const normalized = normalizeForSelected(img);
      const k = String(normalized?.id ?? normalized?.tmpId ?? normalized?.uri ?? '');
      if (!k) return;

      try {
        if (typeof addToSelected === 'function') {
          await addToSelected(normalized, eventKey);
          return;
        }

        if (typeof toggleSelected === 'function') {
          await toggleSelected(normalized, eventKey);
          return;
        }
        if (typeof saveToSelected === 'function') {
          await saveToSelected(normalized, eventKey);
          return;
        }
        if (typeof moveToSelected === 'function') {
          await moveToSelected(normalized, eventKey);
          return;
        }

        setLocalFavSet((prev) => {
          const next = new Set(Array.from(prev));
          if (next.has(k)) next.delete(k);
          else next.add(k);
          return next;
        });
      } catch (e) {
        console.log('addToSelectedFolder error:', e);
        Alert.alert('Failed', 'Could not move this photo to Selected.');
      }
    },
    [addToSelected, toggleSelected, saveToSelected, moveToSelected, eventKey, normalizeForSelected]
  );

  const toggleSelect = useCallback(
    (item) => {
      const k = getItemKey(item);
      if (!k) return;
      setSelectedKeys((prev) => {
        const s = new Set(prev.map(String));
        if (s.has(k)) s.delete(k);
        else s.add(k);
        return Array.from(s);
      });
    },
    [getItemKey]
  );

  const handleSinglePress = (item) => {
    if (selectMode) return toggleSelect(item);

    const u = resolveDisplayUri(getRawUri(item));
    setSelectedImage({ ...(item || {}), uri: u });

    router.push({
      pathname: '/DynamicImagePreview',
      params: { folderName, albumId: effectiveAlbumId, role, slug: deepSlug, t: deepToken },
    });
  };

  const handleLongPress = (item) => {
    if (selectMode) return;

    if (!isNumericId(item?.id)) {
      Alert.alert('Please wait', 'This photo is still syncing. Try again in a few seconds.');
      return;
    }

    const u = resolveDisplayUri(getRawUri(item));
    setHeldImage({ ...(item || {}), uri: u });
    setHoldModalVisible(true);
  };

  const handleAddFromGallery = async () => {
    if (!canUpload) return;

    let albumIdToUse = uploadAlbumId;
    let scopeAlbumId = effectiveAlbumId;

    if (!albumIdToUse && !isGuestDeepLink) {
      const nextId = await ensureNumericAlbumIdForUpload();
      if (nextId) {
        albumIdToUse = nextId;
        scopeAlbumId = nextId;
      }
    }

    if (!albumIdToUse) {
      Alert.alert('Album not ready', 'We are still setting up your album. Please try again in a moment.');
      return;
    }

    const weddingIdForUpload = getWeddingIdForUpload();
    if (!weddingIdForUpload) {
      Alert.alert('Wedding not ready', 'Wedding id is missing. Please re-login or refresh wedding context.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (pickerResult.canceled) return;

      setUploading(true);

      const assets = pickerResult.assets || [];
      const batchSeed = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      for (let idx = 0; idx < assets.length; idx++) {
        const a = assets[idx];
        const localUri = a?.uri;
        if (!localUri) continue;

        let sizeBytes = 0;
        try {
          // expo-image-picker provides fileSize directly — prefer it
          sizeBytes = Number(a.fileSize || 0) || 0;
          if (!sizeBytes) {
            const info = await FileSystem.getInfoAsync(localUri);
            sizeBytes = Number(info?.size || 0) || 0;
          }
        } catch {
          sizeBytes = 0;
        }

        const tmpId = `tmp_${batchSeed}_${idx}`;

        const ext = getExtFromUri(localUri);
        const contentType = mimeFromExt(ext);
        const isVideo = String(contentType || '').startsWith('video/');

        addOptimisticImage({ albumId: scopeAlbumId, uri: localUri, tmpId, sizeBytes, isVideo });

        const originalFileName = String(a?.fileName || `upload.${ext || 'jpg'}`);

        const presignRes = await apiFetch(`/photos/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            weddingId: weddingIdForUpload,
            albumId: String(albumIdToUse),
            originalFileName,
            mimeType: contentType,
          }),
        });

        if (!presignRes?.ok) {
          const msg = typeof presignRes?.body === 'string' ? presignRes.body : JSON.stringify(presignRes?.body || {});
          throw new Error(`presign failed (${presignRes?.status || 'unknown'}): ${msg}`);
        }

        const uploadUrl = presignRes?.json?.data?.uploadUrl;
        const key = presignRes?.json?.data?.key;

        if (!uploadUrl || !key) throw new Error('presign missing uploadUrl/key');

        const blob = await uriToBlob(localUri);
        // blob.size is the most reliable source — use it if picker/FileSystem didn't give us a size
        if (blob?.size > 0) sizeBytes = Number(blob.size);

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: blob,
        });
        if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);

        const saveRes = await apiFetch(`/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            data: {
              image_url: key,
              album: String(albumIdToUse),
              size_bytes: sizeBytes,
            },
          }),
        });
        if (!saveRes?.ok) throw new Error(`save photo failed (${saveRes?.status || 'unknown'})`);

        if (sizeBytes > 0) await consumeBytes(sizeBytes, userPhoneNumber);
      }

      const r = await refreshNow();
      if (r?.ok !== false) pruneOptimistic(scopeAlbumId);
    } catch (e) {
      console.log('Upload error:', e);
      Alert.alert('Upload failed', String(e?.message || e));
    } finally {
      setUploading(false);
    }
  };

const handleFacialRecognition = useCallback(() => {
  router.push('/face-consent');
}, [router]);

  const onToggleFavouriteOne = useCallback(
    async (img) => {
      if (!img) return;
      const k = String(img?.id ?? img?.tmpId ?? img?.uri ?? '');
      try {
        await addToSelectedFolder(img);
      } finally {
        if (k) {
          setLocalFavSet((prev) => {
            const next = new Set(Array.from(prev));
            next.add(k);
            return next;
          });
        }
      }
    },
    [addToSelectedFolder]
  );

  const pagination = getPhotoPagination(effectiveAlbumId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNow();
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = useCallback(() => {
    if (isGuestDeepLink) return;
    if (!effectiveAlbumId) return;
    loadMorePhotos(effectiveAlbumId);
  }, [effectiveAlbumId, isGuestDeepLink, loadMorePhotos]);

  const onBack = () => {
    if (uploading || syncing || ensuringAlbum) {
      Alert.alert('Please wait', 'Upload/sync is in progress. Try again in a moment.');
      return;
    }
    router.back();
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedKeys([]);
  };

  const exitSelectMode = () => {
    setSelectedKeys([]);
    setSelectMode(false);
  };

  const selectedNumericIds = useMemo(() => {
    const ids = [];
    for (const k of selectedKeys) {
      const it = displayImages.find((x) => getItemKey(x) === String(k));
      const id = it?.id;
      if (isNumericId(id)) ids.push(String(id));
    }
    return ids;
  }, [selectedKeys, displayImages, getItemKey]);

  const deleteSelected = useCallback(() => {
    if (!selectedNumericIds.length) {
      Alert.alert('Select photos', 'Tap photos to select them, then tap delete.');
      return;
    }

    setConfirmBulkDeleteOpen(true);
  }, [selectedNumericIds]);

  const shareSelected = useCallback(async () => {
    if (!selectedKeys.length) {
      Alert.alert('Select photos', 'Select at least 1 photo to share.');
      return;
    }
    try {
      const k0 = String(selectedKeys[0]);
      const it = displayImages.find((x) => getItemKey(x) === k0);
      const u = resolveDisplayUri(getRawUri(it));
      if (!u) return;

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }

      const fileUri = await ensureLocalFileUri(u);
      const mimeType = guessMime(fileUri);
      await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Share photo' });
    } catch (e) {
      console.log('Share selected error:', e);
      Alert.alert('Share failed', String(e?.message || e || 'Could not share this photo.'));
    }
  }, [selectedKeys, displayImages, getItemKey]);

  const favouriteSelected = useCallback(async () => {
    if (!selectedKeys.length) {
      Alert.alert('Select photos', 'Select at least 1 photo to favourite.');
      return;
    }
    for (const k of selectedKeys) {
      const it = displayImages.find((x) => getItemKey(x) === String(k));
      if (it) await addToSelectedFolder(it);
    }
  }, [selectedKeys, displayImages, getItemKey, addToSelectedFolder]);

  const selectBarH = useMemo(() => clamp(H * 0.095, 70, 86), [H]);
  const bottomPad = insets.bottom;
  const barNudge = useMemo(() => clamp(bottomPad * 0.18, 2, 6), [bottomPad]);

  const listBottomPad = useMemo(() => {
    const base = insets.bottom + clamp(gutter, 10, 16);
    const floatingStackH =
      canUpload && !selectMode
        ? uploadCard + floatingCardGap + facialCard + clamp(gutter * 1.1, 16, 26)
        : 0;
    const guestFacialH =
      isGuestDeepLink && !selectMode ? facialCard + clamp(gutter * 1.1, 16, 26) : 0;
    const selectPad = selectMode ? selectBarH + bottomPad + 8 : 0;
    return base + floatingStackH + guestFacialH + selectPad;
  }, [insets.bottom, gutter, canUpload, isGuestDeepLink, selectMode, uploadCard, facialCard, floatingCardGap, selectBarH, bottomPad]);

  const selectedForEvent = useMemo(() => {
    if (typeof getSelectedByEvent !== 'function') return [];
    const arr = getSelectedByEvent(eventKey);
    return Array.isArray(arr) ? arr : [];
  }, [getSelectedByEvent, eventKey]);

  const selectedSetForHold = useMemo(() => {
    const s = new Set();
    for (const x of selectedForEvent) {
      const id = x?.id != null ? String(x.id) : '';
      const u = resolveDisplayUri(getRawUri(x));
      if (id) s.add(`id:${id}`);
      if (u) s.add(`u:${u}`);
    }
    return s;
  }, [selectedForEvent]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors?.background ?? '#fff' }]}>
      <AlbumHeader
        weddingData={{
          ...weddingData,
          brideName: paramBrideName || weddingData?.brideName,
          groomName: paramGroomName || weddingData?.groomName,
          coupleName: paramCoupleName || weddingData?.coupleName,
          weddingDate: paramWeddingDate || weddingData?.weddingDate,
          weddingTitle: paramWeddingTitle || weddingData?.weddingTitle,
        }}
        onCastPress={tvOnCastPress}
        onAboutPress={isCouple ? () => router.push('./profile') : undefined}
        tvConnected={tvConnected}
      />

      <View style={{ paddingHorizontal: 0, paddingTop: 0 }}>
        <View
          style={[
            styles.galleryHeaderCard,
            {
              width: '100%',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              paddingVertical: clamp(gutter * 0.45, 8, 12),
              paddingHorizontal: clamp(gutter * 1.1, 18, 26),
              backgroundColor: Colors?.background ?? '#fff',
            },
          ]}
        >
          <View style={styles.galleryTopBar}>
            <TouchableOpacity onPress={onBack} style={{ width: 52, alignItems: 'flex-start' }} activeOpacity={0.85}>
              <BackIconSvg
                width={clamp(W * 0.055, 18, 24)}
                height={clamp(W * 0.055, 18, 24)}
              />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={[
                  styles.eventTitle,
                  { fontSize: clamp(W * 0.05, 16, 20), color: Colors?.textPrimary ?? '#111' },
                ]}
                numberOfLines={1}
              >
                {folderName}
              </Text>
              <Text
                style={{
                  fontSize: clamp(W * 0.034, 12, 14),
                  color: Colors?.textSecondary ?? '#666',
                  marginTop: clamp(gutter * 0.18, 2, 6),
                }}
              >
                {pagination.totalCount != null ? pagination.totalCount : displayImages.length} items {syncing ? '• syncing…' : ''}{' '}
                {selectMode ? `• ${selectedKeys.length} selected` : ''}
              </Text>
            </View>

            <View style={{ width: 52, alignItems: 'flex-end' }}>
              {selectMode ? (
                <TouchableOpacity onPress={exitSelectMode} activeOpacity={0.85} style={{ paddingHorizontal: 6 }}>
                  <CloseIconSvg
                    width={clamp(W * 0.055, 18, 24)}
                    height={clamp(W * 0.055, 18, 24)}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={enterSelectMode} activeOpacity={0.85}>
                  <TickIconSvg
                    width={clamp(W * 0.055, 18, 24)}
                    height={clamp(W * 0.055, 18, 24)}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={displayImages}
        keyExtractor={(item) => String(item?.id ?? item?.tmpId ?? item?.uri ?? item?.image_url ?? '')}
        numColumns={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          pagination.loading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: gap,
          paddingBottom: listBottomPad,
          gap,
        }}
        columnWrapperStyle={{ gap }}
        renderItem={({ item }) => {
          const key = getItemKey(item);
          const selected = selectMode && selectedSet.has(String(key));
          const imgUri = resolveDisplayUri(getRawUri(item));
          const tileR = clamp(gutter * 0.55, 10, 14);

          const ext = getExtFromUri(imgUri || item?.image_url || item?.uri || '');
          const ct = mimeFromExt(ext);
          const isVideo = !!item?.isVideo || String(ct).startsWith('video/');

          return (
            <TouchableOpacity
              style={{
                width: tileW,
                aspectRatio: 1,
                borderRadius: tileR,
                backgroundColor: Colors?.surfaceAlt ?? '#f2f2f2',
                overflow: 'hidden',
              }}
              onPress={() => handleSinglePress(item)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={260}
              activeOpacity={0.9}
            >
              <Image
                source={imgUri ? { uri: imgUri } : undefined}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />

              {isVideo ? (
                <View style={styles.videoBadge}>
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                </View>
              ) : null}

              {selectMode ? (
                <View pointerEvents="none" style={[styles.selOverlay, selected ? styles.selOverlayOn : null]}>
                  <View style={[styles.selBadge, { borderColor: Colors?.background ?? '#fff' }]}>
                    <Text style={{ color: Colors?.background ?? '#fff', fontWeight: '900' }}>
                      {selected ? '✓' : ''}
                    </Text>
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: clamp(H * 0.08, 28, 54), alignItems: 'center' }}>
            <Text style={{ color: Colors?.textSecondary ?? '#666', fontWeight: '700' }}>
              {isGuestDeepLink ? 'No photos yet' : 'Add your first photo'}
            </Text>
          </View>
        }
      />

     {canUpload && !selectMode && (
  <View
    style={[
      styles.floatingStack,
      {
        right: fabRight,
        bottom: fabBottom,
      },
    ]}
  >
<View
  style={[
    styles.floatingGroup,
    {
      borderRadius: clamp(uploadRadius, 16, 22),
      backgroundColor: '#EEEEEEBD',
      paddingHorizontal: 6,
      paddingBottom: 10,
      paddingTop: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: 2,
    },
  ]}
>
    {/* RIGHT: Upload Data */}
  <Pressable
    onPress={handleAddFromGallery}
    style={[
      styles.uploadCard,
      styles.groupCard,
      {
        width: uploadCard,
        borderRadius: uploadRadius,
        alignItems: 'center',
      },
    ]}
  >
    <View
      style={[
        styles.uploadCircle,
        {
          width: uploadCircle,
          height: uploadCircle,
          borderRadius: uploadCircle / 2,
          marginTop: clamp(uploadCard * 0.06, 4, 7),
        },
      ]}
    >
      {uploading || ensuringAlbum ? (
        <ActivityIndicator color={Colors?.textPrimary ?? '#111'} />
      ) : (
       <PlusIcon
  width={uploadPlus}
  height={uploadPlus}
/>
      )}
    </View>

    <Text
      style={[
        styles.uploadLabel,
        {
          fontSize: uploadLabel,
          color: Colors?.textSecondary ?? '#777',
          marginTop: clamp(uploadCard * 0.08, 5, 8),
        },
      ]}
      numberOfLines={1}
    >
      Upload Data
    </Text>
  </Pressable>
  {/* LEFT: Facial Recognition */}
  <Pressable
    onPress={handleFacialRecognition}
    style={[
      styles.uploadCard,
      styles.groupCard,
      {
        width: uploadCard,
        borderRadius: uploadRadius,
        alignItems: 'center',
      },
    ]}
  >
    <View
      style={[
        styles.uploadCircle,
        styles.facialCircleWrap,
        {
          width: uploadCircle,
          height: uploadCircle,
          borderRadius: uploadCircle / 2,
          marginTop: clamp(uploadCard * 0.06, 4, 7),
        },
      ]}
    >
      <FacialRecognitionIconSvg
        width={uploadPlus}
        height={uploadPlus}
      />
    </View>

 <Text
  style={[
    styles.uploadLabel,
    styles.facialLabelText,
    {
      fontSize: uploadLabel,
      lineHeight: uploadLabel + 2,
      paddingBottom: 1,
      textAlign: 'center',
      color: Colors?.textSecondary ?? '#777',
      marginTop: clamp(uploadCard * 0.07, 4, 7),
    },
  ]}
  numberOfLines={2}
>
  Facial{'\n'}Recognition
</Text>
  </Pressable>


</View>
  </View>
)}

      {/* Facial recognition FAB for guest mode */}
      {isGuestDeepLink && !selectMode && (
        <View
          style={[
            styles.floatingStack,
            { right: fabRight, bottom: fabBottom - 8 },
          ]}
        >
          <View
            style={[
              styles.floatingGroup,
              {
                borderRadius: clamp(facialRadius, 16, 22),
                backgroundColor: '#EEEEEEBD',
                paddingHorizontal: 2,
                paddingBottom: 5,
                paddingTop: 0,
              },
            ]}
          >
            <Pressable
              onPress={handleFacialRecognition}
              style={{
                width: facialCard,
                height: facialCard,
                borderRadius: facialRadius,
                backgroundColor: 'transparent',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <View
                style={[
                  styles.uploadCircle,
                  styles.facialCircleWrap,
                  {
                    width: facialCircle,
                    height: facialCircle,
                    borderRadius: facialCircle / 2,
                    marginTop: clamp(facialCard * 0.12, 8, 12),
                  },
                ]}
              >
                <FacialRecognitionIconSvg width={facialIconSize} height={facialIconSize} />
              </View>
              <Text
                style={{
                  fontSize: facialLabel,
                  lineHeight: facialLabel + 2,
                  fontWeight: '500',
                  textAlign: 'center',
                  color: Colors?.textSecondary ?? '#777',
                  marginTop: clamp(facialCard * 0.07, 4, 7),
                  paddingBottom: 1,
                }}
                numberOfLines={2}
              >
                {'Facial\nRecognition'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {selectMode && (
        <View
          style={[
            styles.bottomBarWrap,
            {
              height: selectBarH + bottomPad + barNudge,
              paddingBottom: bottomPad + barNudge,
              bottom: -barNudge,
            },
          ]}
        >
          <View style={[styles.bottomBar]}>
            <View style={styles.bottomRow}>
              <TouchableOpacity onPress={shareSelected} activeOpacity={0.85} style={styles.bottomBtn}>
                <SvgIcon Icon={ShareIconSvg} size={clamp(W * 0.055, 18, 24)} tint={Colors?.textPrimary ?? '#111'} />
                <Text style={[styles.bottomText, { color: Colors?.textPrimary ?? '#111' }]}>Share</Text>
              </TouchableOpacity>

              {!isGuestDeepLink && (
                <TouchableOpacity onPress={favouriteSelected} activeOpacity={0.85} style={styles.bottomBtn}>
                  <SvgIcon Icon={FavouriteIconSvg} size={clamp(W * 0.055, 18, 24)} />
                  <Text style={[styles.bottomText, { color: Colors?.textPrimary ?? '#111' }]}>Favourite</Text>
                </TouchableOpacity>
              )}

              {!isGuestDeepLink && (
                <TouchableOpacity onPress={deleteSelected} activeOpacity={0.85} style={styles.bottomBtn}>
                  <SvgIcon Icon={DeleteIconSvg} size={clamp(W * 0.055, 18, 24)} tint={Colors?.danger ?? '#c00'} />
                  <Text style={[styles.bottomText, { color: Colors?.danger ?? '#c00' }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={confirmBulkDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmBulkDeleteOpen(false)}
      >
        <Pressable
          style={[modalStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
          onPress={() => setConfirmBulkDeleteOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[
              modalStyles.confirmCard,
              { width: Math.min(W - 48, 320), borderRadius: 18, backgroundColor: Colors?.background ?? '#fff' },
            ]}
          >
            <Text style={[modalStyles.confirmTitle, { color: Colors?.textPrimary ?? '#111' }]}>
              Delete selected photos
            </Text>
            <Text style={[modalStyles.confirmBody, { color: Colors?.textSecondary ?? '#666' }]}>
              Delete {selectedNumericIds.length} photo(s)?
            </Text>

            <View style={modalStyles.confirmRow}>
              <TouchableOpacity
                onPress={() => setConfirmBulkDeleteOpen(false)}
                activeOpacity={0.85}
                style={modalStyles.confirmBtn}
              >
                <Text style={[modalStyles.confirmBtnText, { color: themePrimary() }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setConfirmBulkDeleteOpen(false);
                  try {
                    for (const id of selectedNumericIds) {
                      await deleteByIdWithRefund(id);
                    }
                  } catch (e) {
                    console.log('Delete selected error:', e);
                    Alert.alert('Delete failed', String(e?.message || e));
                  } finally {
                    setSelectedKeys([]);
                    setSelectMode(false);
                  }
                }}
                activeOpacity={0.85}
                style={modalStyles.confirmBtn}
              >
                <Text style={[modalStyles.confirmBtnText, { color: themePrimary() }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <DynamicImageHoldModal
        visible={holdModalVisible}
        image={heldImage}
        onClose={async (result) => {
          if (result?.action === 'delete' && result?.id) {
            try {
              await deleteByIdWithRefund(result.id);
            } catch (e) {
              console.log('Delete one error:', e);
              Alert.alert('Delete failed', String(e?.message || e));
            }
          }
          setHoldModalVisible(false);
        }}
        canShare={true}
        canFavourite={!isGuestDeepLink}
        canDelete={isCouple}
        onToggleFavourite={async (img) => {
          await onToggleFavouriteOne(img);
          setHoldModalVisible(false);
        }}
        isFavourited={(() => {
          if (!heldImage) return false;
          const u = resolveDisplayUri(getRawUri(heldImage));
          const idKey = heldImage?.id != null ? `id:${String(heldImage.id)}` : '';
          const uriKey = u ? `u:${u}` : '';
          const localKey = String(heldImage?.id ?? heldImage?.tmpId ?? heldImage?.uri ?? '');
          return (
            (!!idKey && selectedSetForHold.has(idKey)) ||
            (!!uriKey && selectedSetForHold.has(uriKey)) ||
            localFavSet.has(localKey)
          );
        })()}
      />

      <ConnectToTVModal
        visible={showTVModal}
        onClose={() => setShowTVModal(false)}
        weddingId={tvWeddingId}
        onConnected={tvOnConnected}
      />

      <ConnectionSuccessModal
        visible={showTVSuccess}
        onClose={() => setShowTVSuccess(false)}
        onDisconnect={tvOnDisconnect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  galleryHeaderCard: {
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    alignSelf: 'stretch',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  galleryTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTitle: { fontWeight: '800', textAlign: 'center' },





  uploadCircle: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  uploadLabel: { fontWeight: '700', textAlign: 'center' },

floatingStack: {
  position: 'absolute',
  zIndex: 999,
  elevation: 999,
  alignItems: 'center',
},

floatingGroup: {
  alignItems: 'center',
  justifyContent: 'center',
},

uploadCard: {
  backgroundColor: 'transparent',
  justifyContent: 'flex-start',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
},

groupCard: {
  overflow: 'hidden',
},

facialCard: {
  overflow: 'hidden',
},
  facialCircleWrap: {
    backgroundColor: '#fff',
  },

  facialLabelText: {
    lineHeight: 12,
    textAlign: 'center',
  },

  videoBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.4,
  },

  selOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.00)',
  },
  selOverlayOn: { backgroundColor: 'rgba(0,0,0,0.18)' },
  selBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: BAR_BG,
  },
  bottomBar: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: BAR_BG,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bottomRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  bottomBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  bottomText: { marginTop: 3, fontWeight: '700', fontSize: 11 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  imageShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
    backgroundColor: 'transparent',
  },

  box: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },

  actionBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 0,
  },
  actionText: { marginTop: 2, fontWeight: '700' },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  confirmCard: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  confirmTitle: { fontWeight: '900', fontSize: 16 },
  confirmBody: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  confirmRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  confirmBtnText: { fontWeight: '900', fontSize: 14 },
});