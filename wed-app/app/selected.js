

import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

import { useImages } from '../context/ImagesContext';
import { useWedding } from '../context/WeddingContext';
import { API_URL } from '../utils/api';

import BackIcon from '../assets/images/Back icon.svg';
import DeleteIcon from '../assets/images/delete.svg';
import FolderIcon from '../assets/images/folder.svg';
import LockIcon from '../assets/images/locks.svg';
import ShareIcon from '../assets/images/Share.svg';
import AlbumHeader from '../components/Albumheader';


const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

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

const isHttpUri = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const isFileUri = (u) => typeof u === 'string' && /^file:\/\//i.test(u);
const isContentUri = (u) => typeof u === 'string' && /^content:\/\//i.test(u);

const joinUrl = (base, path) => {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  if (!b) return `/${p}`;
  return `${b}/${p}`;
};

const getRawUri = (item) => {
  if (!item) return '';
  const u =
    item.uri ||
    item.url ||
    item.imageUrl ||
    item.src ||
    item.image_url ||
    item.imageUrlKey ||
    item.key ||
    item.path;
  return typeof u === 'string' ? u.trim() : '';
};

const resolveDisplayUri = (raw) => {
  const u = String(raw || '').trim();
  if (!u) return '';
  if (isHttpUri(u) || isFileUri(u) || isContentUri(u) || u.includes('://')) return u;
  return joinUrl(API_URL, u);
};

// ============ share helper ============
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
// =====================================

const holdGlassBoxStyle = () => ({
  backgroundColor: '#FFFFFFC4', // ~77%
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.55)',
});

const themePrimary = () => Colors?.primary ?? Colors?.primaryPink ?? '#E85A70';

function ActionIcon({ Icon, size, tint }) {
  return <Icon width={size} height={size} fill={tint} />;
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

function SelectedImageHoldModal({ visible, image, eventKey, onClose, onRemoveFromSelected }) {
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [measured, setMeasured] = useState({ w: 1, h: 1 });

  React.useEffect(() => {
    if (!visible) return;
    const uri = resolveDisplayUri(getRawUri(image));
    if (!uri) return;

    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && setMeasured({ w: Math.max(1, w), h: Math.max(1, h) }),
      () => alive && setMeasured({ w: 1, h: 1 })
    );
    return () => {
      alive = false;
    };
  }, [visible, image]);

  const fitted = useMemo(() => {
    const mw = Math.max(1, Number(measured.w || 1));
    const mh = Math.max(1, Number(measured.h || 1));
    const scale = Math.min(cardW / mw, imgBoxH / mh);
    return { w: Math.max(1, Math.floor(mw * scale)), h: Math.max(1, Math.floor(mh * scale)) };
  }, [measured, cardW, imgBoxH]);

  if (!visible || !image) return null;

  const uri = resolveDisplayUri(getRawUri(image));

  const handleShare = async () => {
    try {
      if (!uri) return;
      const ok = await Sharing.isAvailableAsync();
      if (!ok) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }
      const fileUri = await ensureLocalFileUri(uri);
      const mimeType = guessMime(fileUri);
      await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: 'Share photo' });
    } catch (e) {
      console.log('Share error:', e);
      Alert.alert('Share failed', String(e?.message || e || 'Could not share this photo.'));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setConfirmOpen(false);
        onClose?.();
      }}
    >
      <Pressable
        style={[modalStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={() => {
          setConfirmOpen(false);
          onClose?.();
        }}
      >
        <Pressable style={{ width: cardW, alignItems: 'center' }} onPress={() => {}}>
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
              {!!uri ? (
                <Image
                  source={{ uri }}
                  resizeMode="contain"
                  style={{
                    width: fitted.w,
                    height: fitted.h,
                    borderRadius: radius,
                    backgroundColor: 'transparent',
                  }}
                />
              ) : null}
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
                <Action
                  label="Share"
                  onPress={handleShare}
                  icon={<ActionIcon Icon={ShareIcon} size={icon} tint={Colors?.textPrimary ?? '#111'} />}
                  textSize={text}
                />

                <Action
                  label="Delete"
                  onPress={() => setConfirmOpen(true)}
                  icon={<ActionIcon Icon={DeleteIcon} size={icon} tint={Colors?.danger ?? '#c00'} />}
                  textSize={text}
                  danger
                />
              </View>
            </View>

            {confirmOpen ? (
              <Pressable
                style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
                onPress={() => setConfirmOpen(false)}
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
                    Remove from Selected
                  </Text>
                  <Text style={[modalStyles.confirmBody, { color: Colors?.textSecondary ?? '#666' }]}>
                    Are you sure you want to remove this image from Selected?
                  </Text>

                  <View style={modalStyles.confirmRow}>
                    <TouchableOpacity
                      onPress={() => setConfirmOpen(false)}
                      activeOpacity={0.85}
                      style={modalStyles.confirmBtn}
                    >
                      <Text style={[modalStyles.confirmBtnText, { color: themePrimary() }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={async () => {
                        setConfirmOpen(false);
                        await onRemoveFromSelected?.(image, eventKey);
                        onClose?.();
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

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const t = useLayoutTokens() || {};
  const { weddingData, getDefaultAlbumId } = useWedding();

  const { selectedFolder, getSelectedByEvent, removeFromSelected, setSelectedImage, setPreviewFromSelected } = useImages();

  const short = Math.min(W, H);
  const gutter = useMemo(
    () => clamp((t?.gutter ?? t?.pad ?? short * 0.06) || short * 0.06, 14, 24),
    [t, short]
  );

  const titleSize = useMemo(() => clamp(W * 0.05, 18, 22), [W]);
  const backSize = useMemo(() => clamp(W * 0.07, 22, 30), [W]);

  // folder tiles
  const tileCols = 3;
  const tileGap = useMemo(() => clamp(gutter * 0.6, 10, 16), [gutter]);

  const tileW = useMemo(() => {
    const usable = W - gutter * 2;
    return (usable - tileGap * (tileCols - 1)) / tileCols;
  }, [W, gutter, tileGap, tileCols]);

  const circleSize = useMemo(() => clamp(tileW * 0.78, 70, 96), [tileW]);
  const iconSize = useMemo(() => clamp(circleSize * 0.36, 24, 34), [circleSize]);
  const labelSize = useMemo(() => clamp(W * 0.032, 12, 13), [W]);

  // ✅ lock badge sizing (same idea as create-album)
  const badgeSize = useMemo(() => clamp(circleSize * 0.25, 18, 24), [circleSize]);
  const badgeOffset = useMemo(() => Math.max(6, Math.round(circleSize * 0.08)), [circleSize]);

  // images grid
  const imgCols = 3;
  const imgGap = useMemo(() => clamp(gutter * 0.55, 10, 16), [gutter]);
  const imgW = useMemo(() => {
    const usable = W - gutter * 2;
    return (usable - imgGap * (imgCols - 1)) / imgCols;
  }, [W, gutter, imgGap]);
  const radiusImg = useMemo(() => clamp(gutter * 0.65, 10, 16), [gutter]);

  const [selectedEvent, setSelectedEvent] = useState(null);

  // ✅ optimistic hidden keys (instant remove + safety)
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set());

  const [holdOpen, setHoldOpen] = useState(false);
  const [heldImage, setHeldImage] = useState(null);

  const handleBack = () => {
    if (selectedEvent) {
      setSelectedEvent(null);
      setHiddenKeys(new Set());
    } else {
      router.back();
    }
  };

  const cText = Colors?.textPrimary ?? Colors?.text ?? '#111';
  const cBorder = Colors?.border ?? 'rgba(0,0,0,0.10)';

  const cFolderBg =
    Colors?.surfaceAlt ??
    Colors?.surface ??
    Colors?.card ??
    (Colors?.backgroundAlt || hexToRgba(cText, 0.06));

  const keyForItem = useCallback((item) => {
    const id = item?.id != null ? String(item.id) : '';
    const u = resolveDisplayUri(getRawUri(item));
    return id ? `id:${id}` : u ? `u:${u}` : '';
  }, []);

  const getAlbumCount = useCallback(
    (event) => {
      const key = String(event || '').trim();
      if (!key) return 0;
      const sel = typeof getSelectedByEvent === 'function' ? getSelectedByEvent(key) : [];
      return Array.isArray(sel) ? sel.length : 0;
    },
    [getSelectedByEvent]
  );

  const albumsForTiles = useMemo(() => {
    const base = ['Wedding', 'Engagement'];

    const otherKeys = new Set();
    Object.keys(selectedFolder || {}).forEach((k) => {
      const kk = String(k || '').trim();
      if (kk) otherKeys.add(kk);
    });

    const ordered = [...base, ...Array.from(otherKeys).filter((k) => !base.includes(k))];

    return ordered
      .map((event) => {
        const count = getAlbumCount(event);
        if (!count) return null;
        return { event, name: event, count };
      })
      .filter(Boolean);
  }, [selectedFolder, getAlbumCount]);

  const selectedImagesRaw = useMemo(() => {
    if (!selectedEvent || typeof getSelectedByEvent !== 'function') return [];
    const arr = getSelectedByEvent(selectedEvent);
    return Array.isArray(arr) ? arr : [];
  }, [selectedEvent, getSelectedByEvent]);

  const selectedImages = useMemo(() => {
    if (!selectedImagesRaw.length) return [];
    return selectedImagesRaw.filter((it) => {
      const k = keyForItem(it);
      return k ? !hiddenKeys.has(k) : true;
    });
  }, [selectedImagesRaw, hiddenKeys, keyForItem]);

  const openPreview = useCallback(
    (item) => {
      const eventKey = String(selectedEvent || '').trim();
      const u = resolveDisplayUri(getRawUri(item));
      setSelectedImage?.({ ...(item || {}), uri: u });
      setPreviewFromSelected?.(true);

      // ✅ IMPORTANT: DynamicImagePreview needs albumId to load images
      const which = eventKey.toLowerCase().includes('engag') ? 'engagement' : 'wedding';
      const albumId = getDefaultAlbumId?.(which);

      // ✅ KEY FIX:
      // This screen is "Selected" -> image already saved once.
      // So: DO NOT allow swipe-up gesture for this image.
      // (We pass multiple flags to match whichever param your DynamicImagePreview checks.)
      router.push({
        pathname: '/DynamicImagePreview',
     params: {
  folderName: eventKey,
  albumId: String(albumId || ''),
  role: 'couple',
  id: String(item?.id ?? ''),

  // ✅ keep '1' for old logic + extra flags
  disableSwipe: '1',
  disable_swipe: '1',
  fromSelected: '1',
  alreadySelected: '1',
  savedOnce: '1',
},
      });
    },
    [router, selectedEvent, setSelectedImage, getDefaultAlbumId]
  );

  const removeFromSelectedOnly = useCallback(
    async (img, eventKey) => {
      const ev = String(eventKey || '').trim();
      const iid = img?.id != null ? String(img.id) : '';
      if (!ev || !iid) return;

      const k = keyForItem(img);

      // ✅ optimistic hide
      if (k) {
        setHiddenKeys((prev) => {
          const next = new Set(Array.from(prev));
          next.add(k);
          return next;
        });
      }

      try {
        // ✅ REAL remove from context (this persists and stops “coming back”)
        if (typeof removeFromSelected === 'function') {
          removeFromSelected(iid, ev);
        } else {
          throw new Error('removeFromSelected not found in ImagesContext');
        }
      } catch (e) {
        console.log('removeFromSelectedOnly error:', e);

        // rollback optimistic hide
        if (k) {
          setHiddenKeys((prev) => {
            const next = new Set(Array.from(prev));
            next.delete(k);
            return next;
          });
        }

        Alert.alert('Failed', String(e?.message || e));
      }
    },
    [removeFromSelected, keyForItem]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors?.background ?? '#fff' }]}>
      <AlbumHeader weddingData={weddingData || {}} onCastPress={() => {}} onAboutPress={() => router.push('./profile')} />

      {/* ✅ header card */}
      <View style={{ paddingHorizontal: 0, paddingTop: 0 }}>
        <View
          style={[
            styles.headerCard,
            {
              width: '100%',
              borderRadius: 16,
              paddingVertical: clamp(gutter * 0.45, 8, 12),
              paddingHorizontal: clamp(gutter * 1.1, 18, 26),
              backgroundColor: Colors?.background ?? '#fff',
            },
          ]}
        >
          <View style={styles.titleRow}>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.85}
              style={{ paddingRight: gutter, paddingVertical: 6 }}
            >
          <BackIcon width={backSize} height={backSize} />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: titleSize, fontWeight: '800', color: Colors?.textPrimary ?? '#111' }}>
                {selectedEvent ? selectedEvent : 'Selected'}
              </Text>
            </View>

            <View style={{ width: backSize + gutter }} />
          </View>
        </View>
      </View>

      {!selectedEvent && (
        <FlatList
          style={{ flex: 1 }}
          data={albumsForTiles}
          keyExtractor={(x, i) => `${x?.event}_${i}`}
          numColumns={tileCols}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingTop: clamp(gutter * 1.0, 14, 22),
            paddingBottom: (insets.bottom || 0) + clamp(gutter * 1.2, 16, 24),
          }}
          columnWrapperStyle={{ gap: tileGap }}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: gutter, paddingTop: clamp(H * 0.10, 36, 70) }}>
              <Text style={{ textAlign: 'center', fontWeight: '800', color: Colors?.textPrimary ?? '#111' }}>
                No selected photos yet!
              </Text>
              <Text
                style={{
                  textAlign: 'center',
                  marginTop: 8,
                  fontWeight: '600',
                  color: Colors?.textSecondary ?? '#666',
                }}
              >
                Swipe up on a photo to add it to Selected.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={{ width: tileW, alignItems: 'center' }}
              onPress={() => {
                setSelectedEvent(item.event);
                setHiddenKeys(new Set());
              }}
            >
              <View
                style={{
                  width: circleSize,
                  height: circleSize,
                  position: 'relative',
                  overflow: 'visible', // ✅ allow badge to sit on edge without clipping
                }}
              >
                <View
                  style={[
                    styles.circle,
                    {
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      backgroundColor: cFolderBg,
                      borderWidth: 1,
                      borderColor: cBorder,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden', // ✅ keep circle contents clipped nicely
                    },
                  ]}
                >
          <FolderIcon width={iconSize} height={iconSize} />
                </View>

                {/* ✅ badge OUTSIDE the clipped circle */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: badgeOffset,
                    top: badgeOffset,
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: Colors?.primaryPink ?? Colors?.primary ?? '#FF5C7A',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    elevation: 9999,
                  }}
                >
<LockIcon
  width={badgeSize * 0.62}
  height={badgeSize * 0.62}
  color="#fff"
/>
                </View>
              </View>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: labelSize,
                  fontWeight: '700',
                  color: Colors?.textSecondary ?? '#666',
                }}
              >
                {item?.name || ''}
              </Text>
            </Pressable>
          )}
        />
      )}

      {selectedEvent && (
        <FlatList
          style={{ flex: 1 }}
          data={selectedImages}
          keyExtractor={(item, idx) => String(item?.id ?? item?.uri ?? idx)}
          numColumns={imgCols}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingTop: imgGap,
            paddingBottom: (insets.bottom || 0) + clamp(gutter * 1.4, 18, 28),
            gap: imgGap,
          }}
          columnWrapperStyle={{ gap: imgGap }}
          renderItem={({ item }) => {
            const imgUri = resolveDisplayUri(getRawUri(item));
            return (
              <TouchableOpacity
                style={{
                  width: imgW,
                  aspectRatio: 1,
                  borderRadius: radiusImg,
                  overflow: 'hidden',
                  backgroundColor: Colors?.surfaceAlt ?? '#f2f2f2',
                }}
                onPress={() => openPreview(item)}
                onLongPress={() => {
                  setHeldImage(item);
                  setHoldOpen(true);
                }}
                delayLongPress={240}
                activeOpacity={0.9}
              >
                {!!imgUri && <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%' }} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <SelectedImageHoldModal
        visible={holdOpen}
        image={heldImage}
        eventKey={String(selectedEvent || '')}
        onClose={() => {
          setHoldOpen(false);
          setHeldImage(null);
        }}
        onRemoveFromSelected={removeFromSelectedOnly}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerCard: {
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  titleRow: { flexDirection: 'row', alignItems: 'center' },

  circle: {
    position: 'relative',
  },
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
  },

  actionText: { marginTop: 2, fontWeight: '700' },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 90,
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