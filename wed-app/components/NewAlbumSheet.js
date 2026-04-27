

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '../theme/colors';

import CloseIcon from '../assets/images/close.svg';
import FolderIcon from '../assets/images/folder.svg';
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

export default function NewAlbumSheet({
  visible,
  onClose,
  value,
  onChangeText,
  onSubmit,
  footerHeight = 0,
  maxWidth = 520,
  emojiSvg: EmojiSvg = FolderIcon, // ✅ default SVG
})  {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const inputRef = useRef(null);
  const lastOverlapRef = useRef(0);

  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  useEffect(() => {
    const screenH = Dimensions.get('screen').height;

    const computeOverlap = (e) => {
      const end = e?.endCoordinates;
      if (!end) return 0;
      const keyboardTopY = typeof end.screenY === 'number' ? end.screenY : screenH - (end.height || 0);
      return Math.max(0, screenH - keyboardTopY);
    };

    const onShow = (e) => {
      const ov = computeOverlap(e);
      if (Math.abs((lastOverlapRef.current || 0) - ov) > 2) {
        lastOverlapRef.current = ov;
        setKeyboardOverlap(ov);
      }
    };

    const onHide = () => {
      lastOverlapRef.current = 0;
      setKeyboardOverlap(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

  // ✅ autofocus when opening
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => inputRef.current?.focus?.(), 60);
    return () => clearTimeout(t);
  }, [visible]);

  const overlapWin = Math.min(keyboardOverlap, H);
  const isKb = overlapWin > 0;

  const short = Math.min(W, H);
  const gutter = useMemo(() => clamp(short * 0.06, 14, 24), [short]);

  const cBg = Colors?.background ?? '#fff';
  const cText = Colors?.textPrimary ?? Colors?.text ?? '#111';
  const cMuted = Colors?.textMuted ?? Colors?.textSecondary ?? '#666';
  const cBorder = Colors?.border ?? '#e7e7e7';
  const cPrimary = Colors?.primaryPink ?? Colors?.primary ?? '#FF5C7A';
  const overlaySoft = useMemo(() => Colors?.overlaySoft ?? hexToRgba(cText, 0.25), [cText]);

  const miniSheetH = useMemo(() => clamp(H * 0.3, 280, 320), [H]);

  const dockBottom = useMemo(() => {
    if (isKb) return overlapWin; // ✅ touch keyboard top
    const fh = Number(footerHeight || 0);
    if (fh > 0) return fh; // ✅ touch footer top
    return insets.bottom || 0;
  }, [isKb, overlapWin, footerHeight, insets.bottom]);

  const bottomGap = useMemo(() => 16 + (isKb ? 8 : 0), [isKb]);

  const safeValue = String(value ?? '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop */}
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: overlaySoft, zIndex: 1 }]} onPress={onClose} />

        {/* Dock */}
        <View style={[styles.bottomDock, { bottom: dockBottom, zIndex: 2, elevation: 2 }]} pointerEvents="box-none">
          <View
            style={[
              styles.miniSheet,
              {
                height: miniSheetH,
                backgroundColor: cBg,
                borderColor: cBorder,
                maxWidth,
                marginHorizontal: gutter,
              },
            ]}
          >
            <View style={[styles.miniHeader, { borderBottomColor: cBorder }]}>
              <Text style={[styles.miniTitle, { color: cText }]}>New Album</Text>

              <TouchableOpacity onPress={onClose} style={styles.miniClose} activeOpacity={0.8}>
         <CloseIcon width={18} height={18} color={cMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.miniBody}>
              <View style={[styles.miniAvatarWrap, { backgroundColor: hexToRgba(cText, 0.07) ?? '#eee' }]}>
               <EmojiSvg width={30} height={30} />
              </View>

              <TextInput
                ref={inputRef}
                value={safeValue}
                onChangeText={(t) => onChangeText?.(t)}
                placeholder="Album Name"
                placeholderTextColor={hexToRgba(cText, 0.35) ?? '#999'}
                style={[
                  styles.miniInput,
                  {
                    borderColor: hexToRgba(cText, 0.18) ?? '#ddd',
                    color: cText,
                  },
                ]}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={onSubmit}
              />
            </View>

            <View style={styles.miniSpacer} />

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSubmit}
              style={[styles.miniPrimaryBtn, { backgroundColor: cPrimary, marginBottom: bottomGap }]}
            >
              <Text style={styles.miniPrimaryText}>CREATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  miniSheet: {
    width: '100%',
    borderWidth: 1,

    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },

  miniHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },

  miniTitle: { fontSize: 14, fontWeight: '900' },

  miniClose: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
    alignItems: 'center',
  },

  miniAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },



  miniInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '700',
  },

  miniSpacer: { height: 10 },

  miniPrimaryBtn: {
    marginHorizontal: 16,
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniPrimaryText: { color: '#fff', fontWeight: '900', letterSpacing: 0.4 },
});