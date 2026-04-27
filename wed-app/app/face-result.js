// app/face-results.js

import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { useWedding } from '../context/WeddingContext';
import Colors from '../theme/colors';
import ConnectToTVModal from './ConnectToTVModal';

import BackIcon from '../assets/images/Back icon.svg';
import TvIcon from '../assets/images/cast.svg';
import DeleteIcon from '../assets/images/delete.svg';
import ShareIcon from '../assets/images/Share.svg';
import UntickIcon from '../assets/images/untick.svg';
import TickIcon from '../assets/images/Vector.svg';

// preview bottom icons
import DownloadIcon from '../assets/images/download.svg';
import EditIcon from '../assets/images/edit2.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const HEART_RED = '#E53935';
const BAR_BG = '#FFFFFFBD';

const safeJsonParse = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(String(value || ''));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const isHttpUri = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const isFileUri = (u) => typeof u === 'string' && /^file:\/\//i.test(u);
const isContentUri = (u) => typeof u === 'string' && /^content:\/\//i.test(u);

const safeNameFromUrl = (url) => {
  const noQuery = String(url || '').split('?')[0];
  const last = noQuery.split('/').pop() || `photo_${Date.now()}.jpg`;
  const clean = last.replace(/[^a-zA-Z0-9._-]/g, '_');
  return /\.[a-zA-Z0-9]+$/.test(clean) ? clean : `${clean}.jpg`;
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
  return u;
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

const formatWeddingDate = (value) => {
  if (!value) return '';

  const s = String(value).trim();

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yyyy, mm, dd] = s.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
};

const getCoupleNames = (weddingData, params, brideName, groomName) => {
  const bride =
    brideName ||
    weddingData?.brideName ||
    weddingData?.bride_name ||
    weddingData?.bride?.name ||
    params?.brideName ||
    '';

  const groom =
    groomName ||
    weddingData?.groomName ||
    weddingData?.groom_name ||
    weddingData?.groom?.name ||
    params?.groomName ||
    '';

  const combined =
    weddingData?.coupleName ||
    weddingData?.couple_name ||
    params?.coupleName ||
    '';

  if (combined) return combined;
  if (bride && groom) return `${bride} & ${groom}`;
  return bride || groom || 'Couple';
};

const getWeddingDateRaw = (weddingData, params, weddingDate) => {
  return (
    weddingDate ||
    weddingData?.weddingDate ||
    weddingData?.wedding_date ||
    weddingData?.date ||
    weddingData?.wedding?.date ||
    weddingData?.wedding?.weddingDate ||
    weddingData?.data?.weddingDate ||
    weddingData?.data?.date ||
    params?.weddingDate ||
    params?.date ||
    ''
  );
};

function SvgActionIcon({ Icon, size }) {
  return <Icon width={size} height={size} />;
}

function ModalAction({ icon, label, onPress, textSize, danger }) {
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
  onShare,
  onDelete,
  onDownload,
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
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

  if (!visible || !image) return null;

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

            <View style={{ height: gap }} />

            <View
              style={[
                modalStyles.box,
                {
                  width: cardW * 0.88,
                  height: actionsBoxH,
                  borderRadius: radius,
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFFC4',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.55)',
                },
              ]}
            >
              <View style={modalStyles.actionBar}>
                <ModalAction
                  label="Share"
                  onPress={() => onShare?.(image)}
                  icon={<SvgActionIcon Icon={ShareIcon} size={icon} />}
                  textSize={text}
                />

                <ModalAction
                  label="Download"
                  onPress={() => onDownload?.(image)}
                  icon={<SvgActionIcon Icon={DownloadIcon} size={icon} />}
                  textSize={text}
                />

                <ModalAction
                  label="Delete"
                  onPress={() => setConfirmDeleteOpen(true)}
                  icon={<SvgActionIcon Icon={DeleteIcon} size={icon} />}
                  textSize={text}
                  danger
                />
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
                      <Text style={[modalStyles.confirmBtnText, { color: Colors?.primaryPink ?? '#E85A70' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setConfirmDeleteOpen(false);
                        onDelete?.(image);
                      }}
                      activeOpacity={0.85}
                      style={modalStyles.confirmBtn}
                    >
                      <Text style={[modalStyles.confirmBtnText, { color: Colors?.primaryPink ?? '#E85A70' }]}>
                        Delete
                      </Text>
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

function PreviewModal({
  visible,
  photos,
  initialIndex,
  onClose,
  onShare,
  onEdit,
  onDownload,
}) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  const titleSize = useMemo(() => clamp(W * 0.044, 16, 18), [W]);
  const bottomBarH = useMemo(() => clamp(H * 0.105, 76, 92), [H]);

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex || 0);

    const t = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: initialIndex || 0,
          animated: false,
        });
      } catch {}
    }, 60);

    return () => clearTimeout(t);
  }, [visible, initialIndex]);

  const currentPhoto = photos[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[previewStyles.root, { backgroundColor: Colors?.background ?? '#fff' }]}>
        <View
          style={[
            previewStyles.header,
            {
              paddingTop: insets.top > 0 ? 6 : 12,
              paddingHorizontal: 16,
            },
          ]}
        >
         

      

        </View>

        <FlatList
          ref={flatListRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => String(item?.id ?? item?.uri ?? index)}
          onMomentumScrollEnd={(e) => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / W);
            setCurrentIndex(nextIndex);
          }}
          getItemLayout={(_, index) => ({
            length: W,
            offset: W * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={{ width: W, flex: 1, paddingHorizontal: 10, paddingVertical: 8 }}>
              <View style={previewStyles.imageWrap}>
                <Image
                  source={{ uri: item?.uri }}
                  style={previewStyles.fullImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}
        />
<View
  style={[
    previewStyles.bottomBar,
    {
      height: bottomBarH + insets.bottom,
      paddingBottom: insets.bottom,
      backgroundColor: Colors?.white ?? '#fff',
      borderTopColor: Colors?.border ?? '#E9E9E9',
    },
  ]}
>

          <View style={previewStyles.bottomRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={previewStyles.bottomItem}
              onPress={() => currentPhoto && onShare?.(currentPhoto)}
            >
              <SvgActionIcon Icon={ShareIcon} size={clamp(W * 0.07, 22, 28)} />
              <Text style={[previewStyles.bottomText, { color: Colors?.textSecondary ?? '#666' }]}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={previewStyles.bottomItem}
              onPress={() => currentPhoto && onEdit?.(currentPhoto, currentIndex)}
            >
              <SvgActionIcon Icon={EditIcon} size={clamp(W * 0.07, 22, 28)} />
              <Text style={[previewStyles.bottomText, { color: Colors?.textSecondary ?? '#666' }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={previewStyles.bottomItem}
              onPress={() => currentPhoto && onDownload?.(currentPhoto)}
            >
              <SvgActionIcon Icon={DownloadIcon} size={clamp(W * 0.07, 22, 28)} />
              <Text style={[previewStyles.bottomText, { color: Colors?.textSecondary ?? '#666' }]}>
                Download
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function FaceResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { weddingData, brideName, groomName, weddingDate } = useWedding();
  const params = useLocalSearchParams();

  const initialPhotos = useMemo(() => {
    const arr = safeJsonParse(params?.photos, []);
    return arr
      .map((x, idx) => ({
        ...x,
        id: x?.id ?? `${idx}_${x?.uri ?? ''}`,
        uri: resolveDisplayUri(getRawUri(x)),
      }))
      .filter((x) => !!x?.uri);
  }, [params?.photos]);

  const [photos, setPhotos] = useState(initialPhotos);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showTVModal, setShowTVModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [heldImage, setHeldImage] = useState(null);
  const [holdModalVisible, setHoldModalVisible] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const coupleNames = getCoupleNames(weddingData, params, brideName, groomName);
  const rawWeddingDate = getWeddingDateRaw(weddingData, params, weddingDate);
  const formattedWeddingDate = formatWeddingDate(rawWeddingDate);

  const short = Math.min(W, H);
  const sidePad = useMemo(() => clamp(short * 0.055, 14, 20), [short]);
  const topNameSize = useMemo(() => clamp(W * 0.055, 18, 27), [W]);
  const topDateSize = useMemo(() => clamp(W * 0.038, 12, 18), [W]);
  const titleSize = useMemo(() => clamp(W * 0.05, 18, 21), [W]);
  const countSize = useMemo(() => clamp(W * 0.03, 11, 13), [W]);
  const gap = useMemo(() => clamp(W * 0.015, 5, 8), [W]);
  const cols = 3;

  const tileSize = useMemo(() => {
    const usable = W - sidePad * 2;
    return (usable - gap * (cols - 1)) / cols;
  }, [W, sidePad, gap, cols]);

  const selectBarH = useMemo(() => clamp(H * 0.095, 70, 86), [H]);
  const bottomPad = insets.bottom;
  const barNudge = useMemo(() => clamp(bottomPad * 0.18, 2, 6), [bottomPad]);

  const selectedSet = useMemo(() => new Set(selectedKeys.map(String)), [selectedKeys]);

  const listBottomPad = useMemo(() => {
    const base = insets.bottom + 24;
    const selectPad = selectMode ? selectBarH + bottomPad + 8 : 0;
    return base + selectPad;
  }, [insets.bottom, selectMode, selectBarH, bottomPad]);

  const getItemKey = useCallback((item) => String(item?.id ?? item?.uri ?? ''), []);

  const openPreview = (index) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedKeys([]);
  };

  const exitSelectMode = () => {
    setSelectedKeys([]);
    setSelectMode(false);
  };

  const toggleSelect = (item) => {
    const k = getItemKey(item);
    if (!k) return;

    setSelectedKeys((prev) => {
      const s = new Set(prev.map(String));
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return Array.from(s);
    });
  };

  const deleteOne = useCallback((item) => {
    const k = getItemKey(item);
    if (!k) return;

    setPhotos((prev) => prev.filter((x) => getItemKey(x) !== k));
    setSelectedKeys((prev) => prev.filter((x) => String(x) !== String(k)));
    setHeldImage(null);
    setHoldModalVisible(false);
    setPreviewOpen(false);
  }, [getItemKey]);

  const shareOne = useCallback(async (item) => {
    try {
      const uri = resolveDisplayUri(getRawUri(item));
      if (!uri) return;

      const available = await Sharing.isAvailableAsync();
      if (!available) {
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
  }, []);

const downloadOne = useCallback(async (item, silent = false) => {
  const uri = resolveDisplayUri(getRawUri(item));
  if (!uri) throw new Error('No photo URL found.');

  const localUri = await ensureLocalFileUri(uri);

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission denied. Please allow it in Settings.');
  }

  await MediaLibrary.createAssetAsync(localUri);
  if (!silent) Alert.alert('Downloaded', 'Photo saved to your gallery.');
}, []);

  const shareSelected = useCallback(async () => {
    if (!selectedKeys.length) {
      Alert.alert('Select photos', 'Select at least 1 photo to share.');
      return;
    }

    const first = photos.find((x) => selectedSet.has(String(getItemKey(x))));
    if (!first) return;

    await shareOne(first);
  }, [selectedKeys.length, photos, selectedSet, getItemKey, shareOne]);

  const downloadSelected = useCallback(async () => {
    if (!selectedKeys.length) {
      Alert.alert('Select photos', 'Select at least 1 photo to download.');
      return;
    }

    const toDownload = photos.filter((x) => selectedSet.has(String(getItemKey(x))));
    let saved = 0;
    let failed = 0;
    let lastError = '';

    for (const item of toDownload) {
      try {
        await downloadOne(item, true);
        saved++;
      } catch (e) {
        failed++;
        lastError = String(e?.message || e || '');
      }
    }

    if (failed > 0) {
      Alert.alert('Download', `${saved} saved, ${failed} failed.${lastError ? `\n${lastError}` : ''}`);
    } else {
      Alert.alert('Downloaded', `${saved} photo${saved !== 1 ? 's' : ''} saved to your gallery.`);
    }
  }, [selectedKeys, photos, selectedSet, getItemKey, downloadOne]);

  const deleteSelected = useCallback(() => {
    if (!selectedKeys.length) {
      Alert.alert('Select photos', 'Tap photos to select them, then tap delete.');
      return;
    }
    setConfirmBulkDeleteOpen(true);
  }, [selectedKeys.length]);

  const onPressTile = (item, index) => {
    if (selectMode) {
      toggleSelect(item);
      return;
    }
    openPreview(index);
  };

  const onLongPressTile = (item) => {
    if (selectMode) return;
    setHeldImage(item);
    setHoldModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors?.background ?? '#fff' }]}>
      <View
        style={[
          styles.topBlock,
          {
            paddingTop: insets.top > 0 ? 6 : 14,
            paddingHorizontal: sidePad,
            backgroundColor: Colors?.white ?? '#fff',
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.coupleNames,
                { fontSize: topNameSize, color: Colors?.textPrimary ?? '#111' },
              ]}
              numberOfLines={1}
            >
              {coupleNames}
            </Text>

            {!!formattedWeddingDate && (
              <Text
                style={[
                  styles.weddingDate,
                  { fontSize: topDateSize, color: Colors?.textSecondary ?? '#777' },
                ]}
              >
                {formattedWeddingDate}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowTVModal(true)}
            activeOpacity={0.85}
            style={styles.tvIconWrap}
          >
            <TvIcon
              width={clamp(W * 0.06, 19, 27)}
              height={clamp(W * 0.06, 19, 27)}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.headerCard,
          {
            paddingHorizontal: sidePad,
            paddingVertical: 12,
            backgroundColor: Colors?.white ?? '#fff',
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} style={styles.sideBtn}>
            <BackIcon
              width={clamp(W * 0.055, 18, 24)}
              height={clamp(W * 0.055, 18, 24)}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text
              style={[
                styles.headerTitle,
                { fontSize: titleSize, color: Colors?.textPrimary ?? '#111' },
              ]}
            >
              Your Photos
            </Text>
            <Text
              style={[
                styles.headerCount,
                { fontSize: countSize, color: Colors?.textSecondary ?? '#777' },
              ]}
            >
              {photos.length} items {selectMode ? `• ${selectedKeys.length} selected` : ''}
            </Text>
          </View>

          <View style={styles.rightActions}>
            {selectMode ? (
              <TouchableOpacity onPress={exitSelectMode} activeOpacity={0.85} style={styles.iconTap}>
                <UntickIcon
                  width={clamp(W * 0.055, 18, 24)}
                  height={clamp(W * 0.055, 18, 24)}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={enterSelectMode} activeOpacity={0.85} style={styles.iconTap}>
                <TickIcon
                  width={clamp(W * 0.055, 18, 24)}
                  height={clamp(W * 0.055, 18, 24)}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={photos}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        numColumns={cols}
        contentContainerStyle={{
          paddingHorizontal: sidePad,
          paddingTop: gap,
          paddingBottom: listBottomPad,
        }}
        columnWrapperStyle={{ gap, marginBottom: gap }}
        renderItem={({ item, index }) => {
          const key = getItemKey(item);
          const selected = selectMode && selectedSet.has(String(key));

          return (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => onPressTile(item, index)}
              onLongPress={() => onLongPressTile(item)}
              delayLongPress={260}
              style={[
                styles.tile,
                {
                  width: tileSize,
                  height: tileSize,
                  borderRadius: 8,
                  backgroundColor: '#F3F3F3',
                },
              ]}
            >
              <Image
                source={{ uri: item?.uri }}
                style={styles.tileImage}
                resizeMode="cover"
              />

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
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: Colors?.textSecondary ?? '#777', fontWeight: '600' }}>
              No matched photos found
            </Text>
          </View>
        }
      />

      {selectMode ? (
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
          <View style={styles.bottomBar}>
            <View style={styles.bottomRow}>
              <TouchableOpacity activeOpacity={0.85} style={styles.bottomBtn} onPress={shareSelected}>
                <SvgActionIcon Icon={ShareIcon} size={clamp(W * 0.055, 18, 24)} />
                <Text style={[styles.bottomText, { color: Colors?.textPrimary ?? '#111' }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} style={styles.bottomBtn} onPress={downloadSelected}>
                <SvgActionIcon Icon={DownloadIcon} size={clamp(W * 0.055, 18, 24)} />
                <Text style={[styles.bottomText, { color: Colors?.textPrimary ?? '#111' }]}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} style={styles.bottomBtn} onPress={deleteSelected}>
                <SvgActionIcon Icon={DeleteIcon} size={clamp(W * 0.055, 18, 24)} />
                <Text style={[styles.bottomText, { color: Colors?.danger ?? '#c00' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

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
              Delete {selectedKeys.length} photo(s)?
            </Text>

            <View style={modalStyles.confirmRow}>
              <TouchableOpacity
                onPress={() => setConfirmBulkDeleteOpen(false)}
                activeOpacity={0.85}
                style={modalStyles.confirmBtn}
              >
                <Text style={[modalStyles.confirmBtnText, { color: Colors?.primaryPink ?? '#E85A70' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setConfirmBulkDeleteOpen(false);
                  setPhotos((prev) => prev.filter((x) => !selectedSet.has(String(getItemKey(x)))));
                  setSelectedKeys([]);
                  setSelectMode(false);
                }}
                activeOpacity={0.85}
                style={modalStyles.confirmBtn}
              >
                <Text style={[modalStyles.confirmBtnText, { color: Colors?.primaryPink ?? '#E85A70' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <DynamicImageHoldModal
        visible={holdModalVisible}
        image={heldImage}
        onClose={() => {
          setHoldModalVisible(false);
          setHeldImage(null);
        }}
        onShare={shareOne}
        onDelete={deleteOne}
        onDownload={async (img) => {
          setHoldModalVisible(false);
          setHeldImage(null);
          try {
            await downloadOne(img);
          } catch (e) {
            Alert.alert('Download failed', String(e?.message || e || 'Could not save photo.'));
          }
        }}
      />

      <PreviewModal
        visible={previewOpen}
        photos={photos}
        initialIndex={previewIndex}
        onClose={() => setPreviewOpen(false)}
        onShare={shareOne}
        onEdit={(item) => {
          const k = getItemKey(item);
          setPreviewOpen(false);
          setSelectMode(true);
          setSelectedKeys(k ? [k] : []);
        }}
        onDownload={async (item) => {
          try {
            await downloadOne(item);
          } catch (e) {
            Alert.alert('Download failed', String(e?.message || e || 'Could not save photo.'));
          }
        }}
      />

      <ConnectToTVModal
        visible={showTVModal}
        onClose={() => setShowTVModal(false)}
        weddingId={weddingData?.weddingId || weddingData?.id || weddingData?._id || ''}
        onScanned={(code) => console.log('QR:', code)}
        onConnectUsingCode={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  topBlock: {
    paddingBottom: 10,
  },

  coupleNames: {
    fontWeight: '800',
    marginTop: 5,
  },

  weddingDate: {
    marginTop: 2,
    fontWeight: '300',
  },

  headerCard: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: 'hidden',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sideBtn: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  tvIconWrap: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },

  headerTitle: {
    fontWeight: '800',
  },

  headerCount: {
    marginTop: 2,
    fontWeight: '500',
  },

  rightActions: {
    width: 68,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  iconTap: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tile: {
    overflow: 'hidden',
  },

  tileImage: {
    width: '100%',
    height: '100%',
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

  selOverlayOn: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

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

headerBar: {
  width: '100%',
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 12,
  alignItems: 'center',
  justifyContent: 'center',
},

headerTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#000',
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

bottomBarPreviewOpen: {
  bottom: 20, // pushes it more down
},

previewWrap: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

previewImage: {
  width: '100%',
  height: '75%',
  resizeMode: 'contain',
},

  bottomBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  bottomText: {
    marginTop: 3,
    fontWeight: '700',
    fontSize: 11,
  },
});

const previewStyles = StyleSheet.create({
  root: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerBtn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontWeight: '800',
  },

  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },

  imageWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F6F6F6',
  },

  fullImage: {
    width: '100%',
    height: '100%',
  },


  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    justifyContent: 'center',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 18,
    flex: 1,
  },

bottomItem: {
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 84,
},

  bottomText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
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
    paddingVertical: 0,
  },

  actionText: {
    marginTop: 2,
    fontWeight: '700',
  },

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

  confirmTitle: {
    fontWeight: '900',
    fontSize: 16,
  },

  confirmBody: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },

  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },

  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  confirmBtnText: {
    fontWeight: '900',
    fontSize: 14,
  },
});