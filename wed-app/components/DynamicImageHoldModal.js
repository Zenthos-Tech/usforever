import { BlurView } from 'expo-blur';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import Colors from '../theme/colors';
import { ensureLocalFileUri, guessMime } from '../utils/photoUri';

import DeleteIconSvg from '../assets/images/Trash.svg';
import ShareIconSvg from '../assets/images/Share.svg';
import FavouriteIconSvg from '../assets/images/selected.svg';

const HEART_RED = '#E53935';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const themePrimary = () => Colors?.primary ?? Colors?.primaryPink ?? '#E85A70';
const holdGlassBoxStyle = () => ({
  backgroundColor: '#FFFFFFC4',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.55)',
});

function SvgIcon({ Icon, size, tint }) {
  return <Icon width={size} height={size} fill={tint} stroke={tint} color={tint} />;
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

export default function DynamicImageHoldModal({
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
