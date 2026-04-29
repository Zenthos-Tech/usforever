import { useEffect, useMemo, useState } from 'react';
import {
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

import DeleteIcon from '../assets/images/delete.svg';
import DownloadIcon from '../assets/images/download.svg';
import ShareIcon from '../assets/images/Share.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

function SvgActionIcon({ Icon, size }) {
  return <Icon width={size} height={size} />;
}

function ModalAction({ icon, label, onPress, textSize, danger }) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.85}>
      {icon}
      <Text
        style={[
          styles.actionText,
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

export default function FaceResultHoldModal({
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
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={() => {
          setConfirmDeleteOpen(false);
          onClose?.({ action: 'close' });
        }}
      >
        <Pressable style={{ width: cardW, alignItems: 'center' }} onPress={() => {}}>
          <View style={{ width: cardW, alignItems: 'center' }}>
            <View
              style={[
                styles.imageShadow,
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
                styles.box,
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
              <View style={styles.actionBar}>
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
                    styles.confirmCard,
                    { width: cardW, borderRadius: radius, backgroundColor: Colors?.background ?? '#fff' },
                  ]}
                >
                  <Text style={[styles.confirmTitle, { color: Colors?.textPrimary ?? '#111' }]}>
                    Delete Image
                  </Text>
                  <Text style={[styles.confirmBody, { color: Colors?.textSecondary ?? '#666' }]}>
                    Are you sure you want to delete this image?
                  </Text>

                  <View style={styles.confirmRow}>
                    <TouchableOpacity
                      onPress={() => setConfirmDeleteOpen(false)}
                      activeOpacity={0.85}
                      style={styles.confirmBtn}
                    >
                      <Text style={[styles.confirmBtnText, { color: Colors?.primaryPink ?? '#E85A70' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setConfirmDeleteOpen(false);
                        onDelete?.(image);
                      }}
                      activeOpacity={0.85}
                      style={styles.confirmBtn}
                    >
                      <Text style={[styles.confirmBtnText, { color: Colors?.primaryPink ?? '#E85A70' }]}>
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

const styles = StyleSheet.create({
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
