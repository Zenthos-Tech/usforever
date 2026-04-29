import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '../theme/colors';
import { API_URL } from '../utils/api';
import { getAuthToken } from '../utils/authToken';

import AlbumFooterBar, { STORAGE_REMAINING_KEY } from '../components/AlbumFooterBar';
import AlbumHeader from '../components/Albumheader';
import DeleteFolderModal from '../components/DeleteFolderModal';
import FolderHoldActionsModal from '../components/FolderHoldActionsModal';
import { FolderTile } from '../components/FolderTile';
import NewAlbumSheet from '../components/NewAlbumSheet';
import RenameAlbumSheet from '../components/RenameAlbumSheet';
import { useImages } from '../context/ImagesContext';
import { useWedding } from '../context/WeddingContext';


import AddFolder from '../assets/images/addfolder.svg';
import FacialRecognitionIconSvg from '../assets/images/facial-recognition.svg';
import { useTvConnection } from '../hooks/useTvConnection';
import ConnectToTVModal from './ConnectToTVModal';
import ConnectionSuccessModal from './ConnectionSuccessModal';
import ShareAccessModal from './share-access';
/** SVG icons */
import AlbumEmojiDefault from '../assets/images/folder.svg';


const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const isNumericOnly = (v) => {
  const s = String(v || '').trim();
  return s.length > 0 && s !== 'undefined' && s !== 'null';
};

function makePerUserStorageKey(baseKey, phoneNumber) {
  const safePhone = String(phoneNumber || '').trim();
  if (!safePhone) return String(baseKey);
  return `${String(baseKey)}_${safePhone}`;
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '').replace('#', '').trim();
  if (!(h.length === 3 || h.length === 6)) return undefined;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
  return `rgba(${r},${g},${b},${alpha})`;
}

function normalizeName(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

// API_URL already resolves env vars in utils/api.ts. Stripping the duplicated
// process.env fallbacks here so we only have one source of truth and so a
// missing config doesn't silently hide behind whichever shadow var was set.
const API_BASE = String(API_URL || '').trim().replace(/\/+$/, '');

const ALBUMS_PATH = '/albums';

// Dev-only logger — calls become no-ops in release builds so URLs, payloads,
// and tokens don't leak to logcat/device logs.
const dlog = (...args) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

async function apiFetch(path, options = {}) {
  if (!API_BASE) throw new Error('Missing API base URL');

  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  // Album endpoints now require auth (see backend batch 12). Pull the JWT
  // via the SecureStore-backed helper and forward it on every call so the
  // couple's session can read/mutate their own albums.
  const token = await getAuthToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.error?.message || json?.error || json?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : `Request failed (${res.status})`);
  }

  return json;
}

function getWeddingIdSafe(weddingData) {
  return (
    weddingData?.weddingId ||
    weddingData?.id ||
    weddingData?._id ||
    weddingData?.wedding?._id ||
    weddingData?.wedding?.id ||
    weddingData?.data?.id ||
    weddingData?.data?.weddingId ||
    null
  );
}

export default function CreateAlbum() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const { weddingData } = useWedding();
  const { getSelectedByEvent, clearSelected } = useImages();

  const params = useLocalSearchParams();
  

const deepSlug = String(params?.slug || '').trim();
const deepToken = String(params?.t || '').trim();
const deepRole = String(params?.role || '').trim();
const deepAccessToken = String(params?.accessToken || '').trim();
const deepWeddingId = String(params?.weddingId || '').trim();
const deepAlbumId = String(params?.albumId || '').trim();
const deepAlbumName = String(params?.albumName || '').trim();

const deepBrideName = String(params?.brideName || '').trim();
const deepGroomName = String(params?.groomName || '').trim();
const deepCoupleName = String(params?.coupleName || '').trim();
const deepWeddingTitle = String(params?.weddingTitle || '').trim();
const deepWeddingDate = String(params?.weddingDate || '').trim();

const deepAlbums = useMemo(() => {
  try {
    const parsed = JSON.parse(params?.albums || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}, [params?.albums]);
const weddingId = useMemo(() => {
  return deepWeddingId || getWeddingIdSafe(weddingData);
}, [deepWeddingId, weddingData]);

 const safeWeddingData = useMemo(() => {
  const wd = weddingData || {};

  const brideName =
    normalizeName(deepBrideName || wd?.brideName || wd?.bride);

  const groomName =
    normalizeName(deepGroomName || wd?.groomName || wd?.groom);

  return {
    ...wd,
    brideName,
    groomName,
    weddingDate: deepWeddingDate || wd?.weddingDate || '',
    weddingTitle:
      deepWeddingTitle ||
      [brideName, groomName].filter(Boolean).join(' & ') ||
      wd?.weddingTitle ||
      '',
    coupleName:
      deepCoupleName ||
      [brideName, groomName].filter(Boolean).join(' & ') ||
      wd?.coupleName ||
      '',
  };
}, [
  weddingData,
  deepBrideName,
  deepGroomName,
  deepWeddingDate,
  deepWeddingTitle,
  deepCoupleName,
]);

const isDeepLink = !!deepSlug && !!deepToken;
const deepLinkRole = String(deepRole || '').trim().toLowerCase();

const needsPassword = params?.needsPassword === 'true';

// needsPassword means it's a locked share link — always guest/photographer, never couple
const isGuestMode = isDeepLink && (needsPassword || deepLinkRole === 'guest' || deepLinkRole === 'photographer');
const isCoupleDeepLink = isDeepLink && deepLinkRole === 'couple';

// real couple session only when user opened app normally
const isNativeCoupleSession = !isDeepLink;

// couple permissions only for real logged-in couple flow
const isCouple = isNativeCoupleSession;

// keep role value safe
const role = deepLinkRole || (isGuestMode ? 'guest' : 'couple');

  const footerRef = useRef(null);

  // When arrived via a password-protected share link, push password screen on
  // top so create-album renders as the blurred background behind the modal.
  useEffect(() => {
    if (!needsPassword || !deepSlug || !deepToken) return;
    router.push({
      pathname: '/passwordscreen',
      params: { slug: deepSlug, t: deepToken },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  useEffect(() => {
    dlog('API_BASE =', API_BASE);
    dlog('weddingData full =', weddingData);
    dlog('resolved weddingId =', weddingId);
  }, [weddingData, weddingId]);
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

const effectiveStoragePersistKey = useMemo(
  () => makePerUserStorageKey(STORAGE_REMAINING_KEY, userPhoneNumber),
  [userPhoneNumber]
);
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        try {
          // ✅ Fetch real storage from backend if weddingId is available
          if (API_BASE && weddingId) {
            // Repair photos with size_bytes = 0 before reading summary (fast no-op once all fixed)
            await apiFetch(`/photos/sync-sizes`, {
              method: 'POST',
              body: JSON.stringify({ weddingId: String(weddingId) }),
            }).catch(() => {});

            const json = await apiFetch(
              `/photos/storage-summary?weddingId=${encodeURIComponent(String(weddingId))}`
            );
            if (alive) {
              const remaining = Number(json?.data?.remainingBytes ?? json?.remainingBytes);
              if (Number.isFinite(remaining)) {
                const clamped = Math.max(0, remaining);
                await AsyncStorage.setItem(effectiveStoragePersistKey, String(clamped));
                if (footerRef.current?.setRemainingBytes) {
                  footerRef.current.setRemainingBytes(clamped);
                }
                return;
              }
            }
          }

          // Fallback: rehydrate from AsyncStorage
          if (footerRef.current?.rehydrate) {
            footerRef.current.rehydrate();
            return;
          }

          const raw = await AsyncStorage.getItem(effectiveStoragePersistKey);
          if (!alive) return;
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && footerRef.current?.setRemainingBytes) {
            footerRef.current.setRemainingBytes(parsed);
          }
        } catch {}
      })();

      return () => {
        alive = false;
      };
    }, [effectiveStoragePersistKey, weddingId])
  );

  const [folders, setFolders] = useState([]);
  const [selectedFolderName, setSelectedFolderName] = useState('Selected');
  const [hideSelectedFolder, setHideSelectedFolder] = useState(false);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);


 useEffect(() => {
  const screenH = Dimensions.get('screen').height;

  const onFrame = (e) => {
    const end = e?.endCoordinates;
    if (!end) return setKeyboardOverlap(0);

    const keyboardTopY =
      typeof end.screenY === 'number' ? end.screenY : screenH - (end.height || 0);

    setKeyboardOverlap(Math.max(0, screenH - keyboardTopY));
  };

  const showSub = Keyboard.addListener('keyboardDidShow', onFrame);
  const frameSub = Keyboard.addListener('keyboardDidChangeFrame', onFrame);
  const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOverlap(0));

  return () => {
    showSub?.remove?.();
    frameSub?.remove?.();
    hideSub?.remove?.();
  };
}, []);

useEffect(() => {
  if (!isDeepLink) return;

  // Use the full albums list returned by the resolve endpoint when available.
  // Fall back to the single shared album if the list is empty.
  if (deepAlbums.length > 0) {
    setFolders(
      deepAlbums.map((a) => ({
        id: String(a.id ?? a._id ?? ''),
        name: String(a.title ?? a.name ?? 'Album'),
        kind: 'shared',
        visibility: 'visible_to_you',
        hidden: false,
        coverUrl: a.coverUrl || null,
      })).filter((f) => f.id)
    );
    return;
  }

  if (!deepAlbumId) return;
  setFolders([
    {
      id: String(deepAlbumId),
      name: String(deepAlbumName || 'Shared Album'),
      kind: 'shared',
      visibility: 'visible_to_you',
      hidden: false,
      coverUrl: null,
    },
  ]);
}, [isDeepLink, deepAlbums, deepAlbumId, deepAlbumName]);

  const overlapWin = Math.min(keyboardOverlap, H);
  const isKb = overlapWin > 0;

  const short = Math.min(W, H);
  const gutter = useMemo(() => clamp(short * 0.06, 14, 24), [short]);
  const cols = 3;
  const gridGap = useMemo(() => clamp(gutter * 0.55, 10, 16), [gutter]);

  const itemW = useMemo(() => {
    const usable = W - gutter * 2;
    return (usable - gridGap * (cols - 1)) / cols;
  }, [W, gutter, gridGap]);

  const circleSize = useMemo(() => clamp(itemW * 0.78, 66, 96), [itemW]);
  const iconSize = useMemo(() => clamp(circleSize * 0.34, 22, 34), [circleSize]);
  const badgeSize = useMemo(() => clamp(circleSize * 0.25, 18, 24), [circleSize]);
  const plusSize = useMemo(() => clamp(circleSize * 0.38, 22, 34), [circleSize]);

  // Facial FAB — same sizing tokens as DynamicGallery
  const facialCard = useMemo(() => clamp(W * 0.22, 86, 112), [W]);
  const facialRadius = useMemo(() => clamp(facialCard * 0.22, 16, 22), [facialCard]);
  const facialCircle = useMemo(() => clamp(facialCard * 0.48, 40, 54), [facialCard]);
  const facialIconSize = useMemo(() => clamp(facialCircle * 0.46, 18, 24), [facialCircle]);
  const facialLabelSize = useMemo(() => clamp(W * 0.024, 8, 10), [W]);
  const fabRight = useMemo(() => clamp(gutter * 0.9, 14, 22), [gutter]);
  const fabBottom = useMemo(() => clamp(gutter * 0.55, 10, 16), [gutter]);

  const cBg = Colors?.background ?? '#fff';
  const cText = Colors?.textPrimary ?? Colors?.text ?? '#111';
  const cMuted = Colors?.textMuted ?? Colors?.textSecondary ?? '#666';
  const cBorder = Colors?.border ?? '#e7e7e7';

  const cFolderBg =
    Colors?.surfaceAlt ??
    Colors?.surface ??
    Colors?.card ??
    (Colors?.backgroundAlt || hexToRgba(cText, 0.06));

  const cPrimary = Colors?.primaryPink ?? Colors?.primary ?? '#FF5C7A';
  const cDanger = Colors?.danger ?? Colors?.primaryPink ?? '#FF5C7A';
  const cDangerSoft = useMemo(
    () => Colors?.dangerSoft ?? hexToRgba(cDanger, 0.12),
    [cDanger]
  );
  const overlaySoft = useMemo(
    () => Colors?.overlaySoft ?? 'rgba(0,0,0,0.35)',
    [Colors?.overlaySoft]
  );

  const footerLift = useMemo(() => clamp(gutter * 0.55, 6, 14), [gutter]);
  const footerBottomOffset = useMemo(
    () => (insets.bottom || 0) + footerLift,
    [insets.bottom, footerLift]
  );
  const footerApproxH = useMemo(() => clamp(H * 0.14, 96, 124), [H]);

  const dockBottom = useMemo(() => {
    if (isKb) return overlapWin;
    if (isGuestMode) return insets.bottom || 0;
    return footerApproxH + footerBottomOffset;
  }, [isKb, overlapWin, isGuestMode, insets.bottom, footerApproxH, footerBottomOffset]);

  const footerReserve = useMemo(() => {
    if (isGuestMode) return insets.bottom + clamp(gutter * 3.2, 64, 92);
    return footerApproxH + footerBottomOffset + clamp(gutter, 12, 18);
  }, [isGuestMode, insets.bottom, gutter, footerApproxH, footerBottomOffset]);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState('create');
  const [folderTitle, setFolderTitle] = useState('');

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);

  const [showFolderActions, setShowFolderActions] = useState(false);
  const [actionsAnchor, setActionsAnchor] = useState(null);

  const activeScale = useRef(new Animated.Value(1)).current;

  const animateHeldScale = useCallback(
    (nextOn) => {
      Animated.timing(activeScale, {
        toValue: nextOn ? 1.22 : 1,
        duration: nextOn ? 160 : 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [activeScale]
  );

  useEffect(() => {
    if (showFolderActions) animateHeldScale(true);
    else animateHeldScale(false);
  }, [showFolderActions, animateHeldScale]);

  const [shareType, setShareType] = useState('family');
  const [shareAccessOpen, setShareAccessOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  const {
    tvConnected,
    showTVModal,
    showTVSuccess: showConnectionSuccess,
    setShowTVModal,
    setShowTVSuccess: setShowConnectionSuccess,
    onConnected: tvOnConnected,
    onDisconnect: tvOnDisconnect,
    onCastPress: tvOnCastPress,
  } = useTvConnection(weddingId);

  const loadFoldersFromStrapi = useCallback(async () => {
    if (!API_BASE) return;
    if (!isCouple || isGuestMode) return;
    if (!weddingId) return;

    try {
      const qs = `?weddingId=${encodeURIComponent(String(weddingId))}`;

      const json = await apiFetch(`${ALBUMS_PATH}${qs}`, { method: 'GET' });
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped = data
        .map((row) => {
          const a = row || {};
          const id = row?._id || row?.id;
          const name = a?.title || a?.name || 'Album';
          const systemKeyRaw = a?.systemKey || null;
          const systemKey = String(systemKeyRaw || '').trim().toLowerCase() || null;
          const normalizedTitle = String(name || '').trim().toLowerCase();

          const isDefault =
            !!a?.isDefault ||
            !!row?.isDefault ||
            !!systemKey ||
            normalizedTitle === 'wedding' ||
            normalizedTitle === 'engagement';

          return {
            id: String(id),
            name: String(name),
            kind: isDefault ? 'base' : 'custom',
            key: systemKey || undefined,
            systemKey: systemKey || null,
            visibility: a?.visibility || 'visible_to_you',
            hidden: false,
            createdAt: a?.createdAt || row?.createdAt || '',
            coverUrl: a?.coverUrl || null,
            photoCount: a?.photoCount ?? 0,
          };
        })
        .filter((x) => x?.id && x?.name);

      const seenDefaultIdentity = new Set();
      const deduped = [];

      for (const folder of mapped) {
        if (folder.kind === 'base') {
          const normalizedTitle = String(folder.name || '').trim().toLowerCase();

          const identity =
            folder.systemKey ||
            (normalizedTitle === 'wedding'
              ? 'wedding'
              : normalizedTitle === 'engagement'
              ? 'engagement'
              : null);

          if (identity) {
            if (seenDefaultIdentity.has(identity)) continue;
            seenDefaultIdentity.add(identity);
          }
        }

        deduped.push(folder);
      }

      setFolders(deduped);
    } catch (e) {
      dlog('LOAD FOLDERS ERROR =', e);
    }
  }, [isCouple, isGuestMode, weddingId]);

  useEffect(() => {
    if (!isCouple || isGuestMode) return;
    loadFoldersFromStrapi();
  }, [isCouple, isGuestMode, loadFoldersFromStrapi]);

  const selectedCount = useMemo(() => {
    if (!getSelectedByEvent) return 0;

    const visible = (folders || []).filter((f) => f && !f.hidden && f.kind !== 'selected');
    let sum = 0;

    visible.forEach((f) => {
      const arr = getSelectedByEvent(String(f.name || '').trim());
      sum += Array.isArray(arr) ? arr.length : 0;
    });

    return sum;
  }, [folders, getSelectedByEvent]);

  const hasSelected = selectedCount > 0;

  const gridFolders = useMemo(() => {
    const visibleFolders = folders.filter((f) => !f.hidden);
    const list = visibleFolders.map((f) => ({ type: 'folder', folder: f }));

    if (hasSelected && !hideSelectedFolder) {
      list.push({
        type: 'folder',
        folder: {
          id: 'selected_folder',
          name: selectedFolderName || 'Selected',
          kind: 'selected',
          visibility: 'visible_to_you',
          hidden: false,
        },
      });
    }

    if (isCouple && !isGuestMode) list.push({ type: 'add' });
    return list;
  }, [folders, hasSelected, hideSelectedFolder, selectedFolderName, isCouple, isGuestMode]);

  const pickDefaultAlbum = useCallback(() => {
    const base = (folders || []).find((f) => f?.kind === 'base' && !f.hidden);

    if (base?.id) {
      return {
        id: String(base.id),
        name: String(base.name),
      };
    }

    const first = (folders || []).find((f) => f && !f.hidden && f.id && f.name);
    return first
      ? {
          id: String(first.id),
          name: String(first.name),
        }
      : null;
  }, [folders]);

  const openShareForType = useCallback(
    (type) => {
      if (isGuestMode) return;
      setShareType(type);

      let next = selectedAlbum;
      if (!next || !next.id) {
        next = pickDefaultAlbum();
        if (next) setSelectedAlbum(next);
      }
      if (!next || !next.id) return;

      setShareAccessOpen(true);
    },
    [selectedAlbum, pickDefaultAlbum, isGuestMode]
  );

  const openCreateFolder = () => {
    if (!isCouple || isGuestMode) return;
    setFolderModalMode('create');
    setFolderTitle('');
    setActiveFolderId(null);
    setActiveFolder(null);
    setShowFolderModal(true);
  };

  const openRenameFolder = (folderId) => {
    if (!isCouple || isGuestMode) return;

    const idStr = String(folderId || '');
    if (!idStr) return;

    if (idStr === 'selected_folder') {
      setActiveFolderId('selected_folder');
      setActiveFolder({
        id: 'selected_folder',
        kind: 'selected',
        name: selectedFolderName || 'Selected',
      });
      setFolderModalMode('rename');
      setFolderTitle(String(selectedFolderName || 'Selected'));
      setShowFolderModal(true);
      return;
    }

    const final = folders.find((x) => String(x.id) === idStr) || null;
    if (!final) return;

    setActiveFolderId(final.id);
    setActiveFolder(final);
    setFolderModalMode('rename');
    setFolderTitle(final.name);
    setShowFolderModal(true);
  };

  const submitFolderModal = useCallback(async () => {
    if (!isCouple || isGuestMode) return;

    const title = String(folderTitle || '').replace(/\s+/g, ' ').trim();
    if (!title) return;

    if (folderModalMode === 'create') {
      const tempId = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const optimistic = {
        id: tempId,
        name: title,
        kind: 'custom',
        visibility: 'visible_to_you',
        hidden: false,
      };

      setFolders((prev) => [...prev, optimistic]);
      setShowFolderModal(false);

      if (API_BASE && weddingId) {
        try {
          const payload = {
            data: {
              title,
              weddingId: String(weddingId),
              hidden: false,
            },
          };

          dlog('CREATE ALBUM API_BASE =', API_BASE);
          dlog('CREATE ALBUM weddingId =', weddingId);
          dlog('CREATE ALBUM payload =', payload);

          const json = await apiFetch(`${ALBUMS_PATH}`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          dlog('CREATE ALBUM response =', json);

          const createdId = json?.data?._id || json?.data?.id;
          const createdTitle = json?.data?.title || title;

          if (createdId) {
            setFolders((prev) =>
              prev.map((f) =>
                f.id === tempId ? { ...f, id: String(createdId), name: String(createdTitle) } : f
              )
            );
          }

          await loadFoldersFromStrapi();
        } catch (e) {
          dlog('CREATE ALBUM ERROR =', e);
          Alert.alert('Error', String(e?.message || 'Album create failed'));
          setFolders((prev) => prev.filter((f) => f.id !== tempId));
        }
      } else {
        dlog('CREATE ALBUM skipped because API_BASE or weddingId missing', {
          API_BASE,
          weddingId,
        });
        Alert.alert('Error', 'Missing API base or weddingId');
        setFolders((prev) => prev.filter((f) => f.id !== tempId));
      }

      return;
    }

    if (folderModalMode === 'rename' && activeFolderId) {
      const idStr = String(activeFolderId);

      if (idStr === 'selected_folder') {
        setSelectedFolderName(title);
        setShowFolderModal(false);
        setShowFolderActions(false);
        return;
      }

      const targetFolder = folders.find((f) => String(f.id) === idStr);
      if (!targetFolder) return;

      const prevFoldersSnapshot = folders;

      setFolders((prev) =>
        prev.map((f) => (String(f.id) === idStr ? { ...f, name: title } : f))
      );
      setShowFolderModal(false);
      setShowFolderActions(false);

      const numeric = isNumericOnly(idStr);
      if (API_BASE && numeric) {
        try {
          const payload = { title };

          dlog('RENAME ALBUM id =', idStr);
          dlog('RENAME ALBUM payload =', payload);

          const json = await apiFetch(`${ALBUMS_PATH}/${idStr}/rename`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });

          dlog('RENAME ALBUM response =', json);
          await loadFoldersFromStrapi();
        } catch (e) {
          dlog('RENAME ALBUM ERROR =', e);
          setFolders(prevFoldersSnapshot);
          Alert.alert('Error', String(e?.message || 'Album rename failed'));
        }
      } else {
        setFolders(prevFoldersSnapshot);
        Alert.alert('Error', 'Invalid album id for rename');
      }
    }
  }, [
    isCouple,
    isGuestMode,
    folderTitle,
    folderModalMode,
    activeFolderId,
    weddingId,
    loadFoldersFromStrapi,
    selectedFolderName,
    folders,
  ]);

  const doDeleteActive = useCallback(async () => {
    if (!isCouple || isGuestMode) return;
    if (!activeFolderId) return;

    const idStr = String(activeFolderId || '').trim();
    const targetFolder =
      folders.find((f) => String(f.id || '') === idStr) || activeFolder || null;

    dlog('DELETE CLICKED folder =', targetFolder);
    dlog('DELETE CLICKED idStr =', idStr);

    setShowDeletePopup(false);
    setShowFolderActions(false);

    if (idStr === 'selected_folder') {
      setHideSelectedFolder(true);
      setActiveFolderId(null);
      setActiveFolder(null);
      clearSelected?.();  // clears all selected photos + syncs to TV backend
      return;
    }

    if (!targetFolder) {
      setActiveFolderId(null);
      setActiveFolder(null);
      return;
    }

    if (!API_BASE || !isNumericOnly(idStr)) {
      Alert.alert('Error', 'Album id is invalid');
      return;
    }

    try {
      dlog('DELETE ALBUM REQUEST URL =', `${API_BASE}${ALBUMS_PATH}/${idStr}`);

      const json = await apiFetch(`${ALBUMS_PATH}/${idStr}`, {
        method: 'DELETE',
      });

      dlog('DELETE ALBUM RESPONSE =', json);

      const freedBytes = Number(json?.freedBytes || 0);
      if (freedBytes > 0 && footerRef.current?.refundBytes) {
        footerRef.current.refundBytes(freedBytes);
      } else if (freedBytes > 0) {
        try {
          const raw = await AsyncStorage.getItem(effectiveStoragePersistKey);
          const current = Number(raw);
          const next = (Number.isFinite(current) ? current : 0) + freedBytes;
          await AsyncStorage.setItem(effectiveStoragePersistKey, String(next));
          if (footerRef.current?.setRemainingBytes) {
            footerRef.current.setRemainingBytes(next);
          }
        } catch (e) {
          dlog('REFUND STORAGE ERROR =', e);
        }
      }

      setFolders((prev) => prev.filter((f) => String(f.id) !== idStr));
      setActiveFolderId(null);
      setActiveFolder(null);

      await loadFoldersFromStrapi();
    } catch (e) {
      dlog('DELETE ALBUM ERROR =', e);
      Alert.alert('Error', String(e?.message || 'Album delete failed'));
    }
  }, [
    isCouple,
    isGuestMode,
    activeFolderId,
    folders,
    activeFolder,
    effectiveStoragePersistKey,
    loadFoldersFromStrapi,
  ]);

  const closeActions = useCallback((opts = {}) => {
    setShowFolderActions(false);
    setActionsAnchor(null);
    if (!opts.keepActive) {
      setActiveFolderId(null);
      setActiveFolder(null);
    }
  }, []);

  const openActionsForFolder = useCallback(
    (folderObj, anchor) => {
      if (isGuestMode) return;

      const target =
        folderObj && typeof folderObj === 'object'
          ? folderObj
          : folders.find((f) => String(f.id) === String(folderObj));

      if (!target) return;

      setActiveFolder(target);
      setActiveFolderId(target?.id ?? null);

      const x = anchor?.x;
      const y = anchor?.y;
      const w = anchor?.w;
      const h = anchor?.h;

      if (x != null && y != null && w != null && h != null) {
        setActionsAnchor({ x, y, w, h });
      } else {
        setActionsAnchor(null);
      }

      setShowFolderActions(true);
    },
    [isGuestMode, folders]
  );

  const isSelectedActive = useMemo(
    () =>
      String(activeFolderId || '') === 'selected_folder' || activeFolder?.kind === 'selected',
    [activeFolderId, activeFolder]
  );

  const holdW = useMemo(() => {
    if (isSelectedActive) return clamp(W * 0.56, 210, 264);
    return clamp(W * 0.46, 160, 206);
  }, [W, isSelectedActive]);

  const holdH = useMemo(() => {
    if (isSelectedActive) return clamp(short * 0.095, 56, 66);
    return clamp(short * 0.085, 48, 56);
  }, [short, isSelectedActive]);

  const holdPos = useMemo(() => {
    const a = actionsAnchor;
    if (!a) return { top: H * 0.35, left: (W - holdW) / 2 };

    const gap = 6;
    const desiredLeft = a.x + a.w - holdW + gap;
    const desiredTop = a.y + a.h - holdH + gap;

    const minTop = insets.top + 8;
    const maxBottom = H - (insets.bottom + 8);
    const top = clamp(desiredTop, minTop, maxBottom - holdH);
    const left = clamp(desiredLeft, gutter, W - holdW - gutter);

    return { top, left };
  }, [actionsAnchor, H, W, holdW, holdH, gutter, insets.top, insets.bottom]);

  const onPressFolder = (item) => {
    if (item.type === 'add') return openCreateFolder();

    const folder = item.folder;
    if (folder?.kind === 'selected' || String(folder?.id) === 'selected_folder') {
      return router.push('/selected');
    }

    router.push({
      pathname: '/DynamicGallery',
      params: {
        folderName: folder.name,
        ...(folder?.id ? { albumId: String(folder.id) } : {}),
        role,
        slug: deepSlug,
        t: deepToken,
        accessToken: deepAccessToken,
        weddingId: weddingId,
        brideName: safeWeddingData.brideName || '',
        groomName: safeWeddingData.groomName || '',
        coupleName: safeWeddingData.coupleName || '',
        weddingDate: safeWeddingData.weddingDate || '',
        weddingTitle: safeWeddingData.weddingTitle || '',
      },
    });
  };

  const sheetColors = useMemo(
    () => ({
      cBg,
      cText,
      cMuted,
      cBorder,
      cPrimary,
      cDanger,
      overlaySoft,
    }),
    [cBg, cText, cMuted, cBorder, cPrimary, cDanger, overlaySoft]
  );

  const FolderSheetComponent = folderModalMode === 'create' ? NewAlbumSheet : RenameAlbumSheet;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cBg }]}>
      <AlbumHeader
        weddingData={safeWeddingData}
        onCastPress={tvOnCastPress}
        tvConnected={tvConnected}
        onAboutPress={isCouple ? () => router.push('./profile') : undefined}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: gutter,
          paddingBottom: footerReserve,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {gridFolders.map((item, idx) => {
            const colIndex = idx % cols;
            const ml = colIndex === 0 ? 0 : gridGap;
            const mt = idx < cols ? 0 : gridGap;

            if (item.type === 'add') {
              return (
                <TouchableOpacity
                  key={`add_${idx}`}
                  style={[styles.folderItem, { width: itemW, marginLeft: ml, marginTop: mt }]}
                  onPress={openCreateFolder}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.circle,
                      {
                        width: circleSize,
                        height: circleSize,
                        borderRadius: circleSize / 2,
                        backgroundColor: cFolderBg,
                      },
                    ]}
                  >
                 
<AddFolder
  width={plusSize}
  height={plusSize}
  fill={cMuted}
/>
                  </View>
                  <Text style={[styles.folderText, { color: cMuted }]}>Add Folder</Text>
                </TouchableOpacity>
              );
            }

            const folder = item.folder;

            const isActiveTile =
              showFolderActions &&
              (String(activeFolderId || '') === String(folder?.id || '') ||
                (folder?.kind === 'selected' &&
                  String(activeFolderId || '') === 'selected_folder'));

            return (
              <FolderTile
                key={folder.id || `${folder.kind}_${folder.key || idx}`}
                folder={folder}
                itemW={itemW}
                ml={ml}
                mt={mt}
                circleSize={circleSize}
                iconSize={iconSize}
                badgeSize={badgeSize}
                selectedCount={selectedCount}
                onPress={() => onPressFolder(item)}
                onOpenActions={(payload) =>
                  openActionsForFolder(payload?.folder, {
                    x: payload?.x,
                    y: payload?.y,
                    w: payload?.w,
                    h: payload?.h,
                  })
                }
                enableLongPress={!isGuestMode}
                theme={{ cSurface: cFolderBg, cMuted, cPrimary, cBorder }}
                isActive={isActiveTile}
                activeScale={isActiveTile ? activeScale : null}
              />
            );
          })}
        </View>
      </ScrollView>

      {!isGuestMode ? (
        <View style={[styles.footerDock, { left: 0, right: 0, bottom: footerBottomOffset }]}>
          <AlbumFooterBar
            ref={footerRef}
            absolute={false}
            bottomPad={0}
            phoneNumber={userPhoneNumber}
            onFamilyPress={() => openShareForType('family')}
            onPhotographerPress={() => openShareForType('photographer')}
          />
        </View>
      ) : null}

      {isGuestMode ? (
        <View
          style={[
            styles.guestFacialBtn,
            { right: fabRight, bottom: (insets.bottom || 0) + fabBottom },
          ]}
        >
          <View
            style={{
              borderRadius: facialRadius,
              backgroundColor: '#EEEEEEBD',
              paddingHorizontal: 2,
              paddingBottom: 5,
              paddingTop: 0,
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/face-consent',
                  // Pass through the deep-link wedding id so guests who never
                  // logged in still hit the right Rekognition collection.
                  params: weddingId ? { weddingId: String(weddingId) } : {},
                })
              }
              activeOpacity={0.85}
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
                style={{
                  width: facialCircle,
                  height: facialCircle,
                  borderRadius: facialCircle / 2,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: clamp(facialCard * 0.12, 8, 12),
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }}
              >
                <FacialRecognitionIconSvg width={facialIconSize} height={facialIconSize} />
              </View>
              <Text
                style={{
                  fontSize: facialLabelSize,
                  lineHeight: facialLabelSize + 2,
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
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <FolderHoldActionsModal
        visible={showFolderActions}
        onClose={() => closeActions()}
        holdW={holdW}
        holdH={holdH}
        holdPos={holdPos}
        isSelectedActive={isSelectedActive}
        onRename={() => {
          const id = activeFolderId;
          if (!id) return;
          closeActions({ keepActive: true });
          openRenameFolder(id);
        }}
        onDelete={() => {
          if (!activeFolderId) return;
          closeActions({ keepActive: true });
          setShowDeletePopup(true);
        }}
        cText={cText}
        cBorder={cBorder}
        cDanger={cDanger}
      />

      <FolderSheetComponent
        visible={showFolderModal}
        mode={folderModalMode}
        value={folderTitle}
        onChange={setFolderTitle}
        onChangeText={setFolderTitle}
        onSubmit={submitFolderModal}
        onClose={() => setShowFolderModal(false)}
        dockBottom={dockBottom}
        gutter={gutter}
        screenH={H}
        keyboardOpen={isKb}
        colors={sheetColors}
        insetsBottom={insets.bottom || 0}
        emojiComponent={AlbumEmojiDefault}
      />

      <DeleteFolderModal
        visible={showDeletePopup}
        onCancel={() => setShowDeletePopup(false)}
        onConfirm={doDeleteActive}
        isSelectedFolder={String(activeFolderId || '') === 'selected_folder'}
        gutter={gutter}
        overlaySoft={overlaySoft}
        cBg={cBg}
        cPrimary={cPrimary}
        cBorder={cBorder}
        cText={cText}
        cMuted={cMuted}
        cDangerSoft={cDangerSoft}
      />

      <ShareAccessModal
        visible={shareAccessOpen}
        onClose={() => setShareAccessOpen(false)}
        shareType={shareType}
        albumId={selectedAlbum?.id}
        albumName={selectedAlbum?.name}
      />

      <ConnectToTVModal
        visible={showTVModal}
        onClose={() => setShowTVModal(false)}
        weddingId={weddingId}
        onConnected={tvOnConnected}
      />

      <ConnectionSuccessModal
        visible={showConnectionSuccess}
        onClose={() => setShowConnectionSuccess(false)}
        onDisconnect={tvOnDisconnect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  folderItem: { alignItems: 'center' },
  circle: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  folderText: { marginTop: 8, fontSize: 12, textAlign: 'center' },

  footerDock: {
    position: 'absolute',
    zIndex: 999,
    elevation: 999,
  },

  guestFacialBtn: {
    position: 'absolute',
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
  },

});