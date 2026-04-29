

import AsyncStorage from '@react-native-async-storage/async-storage';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '../theme/colors';
import {
  DEFAULT_STORAGE_LIMIT_BYTES,
  STORAGE_REMAINING_KEY,
  makePerUserStorageKey,
} from '../utils/userStorageBudget';

import StorageIcon from '../assets/images/Doughnut.svg';
import FamilyIcon from '../assets/images/family&friends.svg';
import PhotographerIcon from '../assets/images/photographer.svg';
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

function clamp0(n) {
  return Math.max(0, Number(n || 0) || 0);
}

function bytesToGBString(bytes) {
  const b = clamp0(bytes);
  const gb = b / 1024 ** 3;
  return `${parseFloat(gb.toFixed(2))} GB`;
}


function AlbumFooterBarInner(
  {
    storageText,
    onFamilyPress,
    onPhotographerPress,
    hideStorage = false,
    hideShare = false,

    // ✅ layout
    absolute = true,
    bottomPad: bottomPadProp,
    horizontalPad: horizontalPadProp,

    // ✅ storage config
    storageLimitBytes = DEFAULT_STORAGE_LIMIT_BYTES,
    storagePersistKey = STORAGE_REMAINING_KEY,

    // ✅ NEW: unique storage bucket per phone number
    phoneNumber,

    // ✅ parent can hydrate once (ex: from backend)
    initialRemainingBytes, // number | undefined

    // ✅ notify parent whenever remaining changes
    onRemainingChange, // (remainingBytes:number) => void
  },
  ref
) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const short = Math.min(W, H);

  const gutter = useMemo(() => clamp(short * 0.06, 14, 24), [short]);

  const bottomPadDefault = useMemo(
    () => (insets.bottom || 0) + clamp(gutter * 0.55, 10, 16),
    [insets.bottom, gutter]
  );

  const bottomPad = Number.isFinite(bottomPadProp) ? bottomPadProp : bottomPadDefault;
  const horizontalPad = Number.isFinite(horizontalPadProp) ? horizontalPadProp : gutter;

  const basePillH = useMemo(() => clamp(H * 0.09, 52, 64), [H]);
  const storagePillH = useMemo(() => clamp(basePillH * 0.78, basePillH * 0.7, basePillH), [basePillH]);
  const sharePillH = useMemo(
    () => clamp(basePillH * 1.35, basePillH * 1.2, basePillH * 1.6),
    [basePillH]
  );

  const radius = useMemo(() => clamp(gutter * 0.8, 12, 16), [gutter]);
  const padH = useMemo(() => clamp(gutter * 0.6, 10, 14), [gutter]);

  // ✅ guaranteed gap between the two grey boxes
  const pillsGap = useMemo(() => clamp(gutter * 0.9, 12, 22), [gutter]);

const storageMaxW = useMemo(() => clamp(W * 0.42, 160, 260), [W]);
  const shareMaxW = useMemo(() => clamp(W * 0.3, 130, 150), [W]);
  const shareOuterRight = useMemo(() => clamp(gutter * 0.75, 10, 18), [gutter]);

  // storage visuals
  const storageIcon = useMemo(() => clamp(W * 0.086, 24, 34), [W]);
  const small = useMemo(() => clamp(W * 0.026, 9, 10.5), [W]);
  const bold = useMemo(() => clamp(W * 0.03, 10.5, 12), [W]);

  // ✅ per request: doughnut LEFT now
  const doughnutShiftX = useMemo(() => clamp(-gutter * 0.35, -14, -6), [gutter]);

  const storageTextPadLeft = useMemo(() => clamp(gutter * 0.25, 6, 10), [gutter]);
  const storagePillPadLeft = useMemo(() => clamp(gutter * 0.45, 8, 14), [gutter]);

  const storagePillShiftUp = useMemo(() => clamp(-gutter * 1.8, -80, -50), [gutter]);
  const storagePillShiftLeft = useMemo(() => clamp(-gutter * 0.45, -18, -8), [gutter]);

  // ✅ NEW: extra left shift for storage box
  const storageExtraShiftLeft = useMemo(() => clamp(-gutter * 0.35, -16, -8), [gutter]);
  const storageShiftXFinal = useMemo(
    () => storagePillShiftLeft + storageExtraShiftLeft,
    [storagePillShiftLeft, storageExtraShiftLeft]
  );

  // ✅ shift "Available" section LEFT too
  const storageContentShiftLeft = useMemo(() => clamp(-gutter * 0.5, -18, -10), [gutter]);

  // share visuals
  const circle = useMemo(() => clamp(W * 0.095, 30, 38), [W]);
  const photographerCircle = useMemo(() => clamp(circle * 0.9, 32, 42), [circle]);
  const circleIcon = useMemo(() => clamp(circle * 0.62, 18, 24), [circle]);
const photographerIcon = useMemo(() => clamp(photographerCircle * 0.6, 20, 30), [photographerCircle]);

  const shareLabel = useMemo(() => clamp(W * 0.024, 8.5, 10), [W]);
  const gap = useMemo(() => clamp(gutter * 0.18, 4, 7), [gutter]);
  const iconBaselineShiftY = useMemo(() => clamp(-gutter * 0.06, -2, -1), [gutter]);
  const sharePadX = useMemo(() => clamp(padH * 1.05, 12, 18), [padH]);

  // ✅ extra right shift for share features
  const shareExtraShiftRight = useMemo(() => clamp(gutter * 0.35, 8, 16), [gutter]);
  const shareOuterRightFinal = useMemo(
    () => Math.max(0, shareOuterRight - shareExtraShiftRight),
    [shareOuterRight, shareExtraShiftRight]
  );

  // ✅ NEW: effective per-user key
  const effectiveStoragePersistKey = useMemo(
    () => makePerUserStorageKey(storagePersistKey, phoneNumber),
    [storagePersistKey, phoneNumber]
  );

  // theme — match DynamicGallery Upload/Facial boxes (semi-transparent)
  const chipBg = '#EEEEEEBD';
  const circleBg = Colors?.surface ?? Colors?.surfaceAlt ?? '#FFFFFF';
  const textMuted = Colors?.textMuted ?? Colors?.textSecondary ?? '#777';
  const text = Colors?.text ?? Colors?.textPrimary ?? '#111';

  const showStorage = !hideStorage;
  const showShare = !hideShare;
  if (!showStorage && !showShare) return null;

  const [remainingBytes, setRemainingBytes] = useState(() => {
    const init = Number.isFinite(initialRemainingBytes) ? clamp0(initialRemainingBytes) : clamp0(storageLimitBytes);
    return Math.min(clamp0(storageLimitBytes), init);
  });

  const hydratedRef = useRef(false);

  const applyRemainingSafe = (next) => {
    const v = clamp0(next);
    setRemainingBytes(Math.min(clamp0(storageLimitBytes), v));
  };

  const rehydrate = async () => {
    try {
      const raw = await AsyncStorage.getItem(String(effectiveStoragePersistKey));
      if (raw != null && String(raw).trim() !== '') {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          hydratedRef.current = true;
          applyRemainingSafe(parsed);
          return;
        }
      }

      const init =
        Number.isFinite(initialRemainingBytes) ? clamp0(initialRemainingBytes) : clamp0(storageLimitBytes);
      hydratedRef.current = true;
      applyRemainingSafe(init);
    } catch {
      const init =
        Number.isFinite(initialRemainingBytes) ? clamp0(initialRemainingBytes) : clamp0(storageLimitBytes);
      hydratedRef.current = true;
      applyRemainingSafe(init);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await rehydrate();
    })();

    return () => {
      mounted = false;
    };
  }, [effectiveStoragePersistKey, storageLimitBytes, initialRemainingBytes]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    (async () => {
      try {
        await AsyncStorage.setItem(
          String(effectiveStoragePersistKey),
          String(clamp0(remainingBytes))
        );
      } catch {}
    })();

    if (typeof onRemainingChange === 'function') {
      onRemainingChange(clamp0(remainingBytes));
    }
  }, [remainingBytes, effectiveStoragePersistKey, onRemainingChange]);

  useImperativeHandle(
    ref,
    () => ({
      consumeBytes: (bytes) => {
        const delta = clamp0(bytes);
        if (delta <= 0) return;
        setRemainingBytes((prev) => Math.max(0, clamp0(prev) - delta));
      },
      refundBytes: (bytes) => {
        const delta = clamp0(bytes);
        if (delta <= 0) return;
        setRemainingBytes((prev) => Math.min(clamp0(storageLimitBytes), clamp0(prev) + delta));
      },
      setRemainingBytes: (bytes) => {
        applyRemainingSafe(bytes);
      },
      resetStorage: () => {
        applyRemainingSafe(storageLimitBytes);
      },
      getRemainingBytes: () => clamp0(remainingBytes),
      rehydrate: () => {
        rehydrate();
      },
    }),
    [remainingBytes, storageLimitBytes, effectiveStoragePersistKey, initialRemainingBytes]
  );

  const remainingText = useMemo(() => bytesToGBString(remainingBytes), [remainingBytes]);
  const limitText = useMemo(() => bytesToGBString(storageLimitBytes), [storageLimitBytes]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        absolute
          ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: bottomPad,
              paddingHorizontal: horizontalPad,
            }
          : {
              position: 'relative',
              paddingHorizontal: horizontalPad,
              paddingBottom: bottomPad,
            },
      ]}
    >
      <View style={styles.row}>
        {showStorage ? (
          <View
            style={[
              styles.pill,
          {
  flexShrink: 0,
  maxWidth: storageMaxW,
  height: storagePillH,
  borderRadius: radius,
  paddingLeft: padH + storagePillPadLeft,
  paddingRight: 2,
  backgroundColor: chipBg,
  transform: [{ translateY: storagePillShiftUp }, { translateX: storageShiftXFinal }],
},
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                transform: [{ translateX: storageContentShiftLeft }],
              }}
            >
             <StorageIcon
  width={storageIcon}
  height={storageIcon}
  style={{
    transform: [{ translateX: doughnutShiftX }],
  }}
/>
              <View
                style={{
                  marginLeft: clamp(gutter * 0.28, 5, 8),
                  paddingLeft: storageTextPadLeft,
                  transform: [{ translateY: -3 }, { translateX: -12 }],
                }}
              >
                <Text style={{ fontSize: small, color: textMuted, fontWeight: '700', textAlign: 'center' }}>
                  Available
                </Text>

                {storageText ? (
                  <Text style={{ fontSize: bold, color: text, fontWeight: '900', textAlign: 'center' }}>
                    {storageText}
                  </Text>
                ) : (
                  <Text style={{ fontSize: bold, color: text }}>
                    <Text style={{ fontWeight: '900' }}>{remainingText}</Text>
                    <Text style={{ fontWeight: '700', color: textMuted }}>{` / ${limitText}`}</Text>
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View />
        )}

        {showStorage && showShare ? <View style={{ width: pillsGap, flexShrink: 0 }} /> : null}

        {showShare ? (
          <View
            style={[
              styles.pill,
              {
                marginLeft: 'auto',
                marginRight: shareOuterRightFinal,
                flexShrink: 1,
                maxWidth: shareMaxW,
                height: sharePillH,
                borderRadius: radius,
                paddingHorizontal: sharePadX,
                backgroundColor: chipBg,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ translateX: shareExtraShiftRight }],
              },
            ]}
          >
            <View
              style={[
                styles.shareRow,
                {
                  gap,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                },
              ]}
            >
              <ShareMiniAction
                label={'Share with\nfriends and\nfamily'}
                onPress={onFamilyPress}
                circleSize={circle}
                iconSize={circleIcon}
             icon={FamilyIcon}
                labelSize={shareLabel}
                circleBg={circleBg}
                textMuted={textMuted}
                iconShiftY={iconBaselineShiftY}
                circleShiftY={0}
              />

              <ShareMiniAction
                label={'Invite\nPhotographer'}
                onPress={onPhotographerPress}
                circleSize={photographerCircle}
                iconSize={photographerIcon}
          icon={PhotographerIcon}
                labelSize={shareLabel}
                circleBg={circleBg}
                textMuted={textMuted}
                circleShiftY={-6}
                iconShiftY={0}
              />
            </View>
          </View>
        ) : (
          <View />
        )}
      </View>
    </View>
  );
}

function ShareMiniAction({
  label,
  onPress,
  circleSize,
  iconSize,
  icon,
  labelSize,
  circleBg,
  textMuted,
  iconShiftY = 0,
  circleShiftY = 0,
}) {
  const s = Math.max(1, Math.round(Number(circleSize) || 0));
  const Icon = icon;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.shareItem, circleShiftY ? { transform: [{ translateY: circleShiftY }] } : null]}
    >
 <View
  style={[
    styles.shareCircle,
    {
      width: s,
      height: s,
      borderRadius: 9999,
      backgroundColor: circleBg,
      overflow: 'hidden',
      alignSelf: 'center',
      flexShrink: 0,
    },
  ]}
>
  <Icon
    width={iconSize}
    height={iconSize}
    style={iconShiftY ? { transform: [{ translateY: iconShiftY }] } : null}
  />
</View>

      <Text
        numberOfLines={3}
        ellipsizeMode="tail"
        style={{
          marginTop: 3,
          fontSize: labelSize,
          lineHeight: Math.max(11, labelSize * 1.22),
          color: textMuted,
          fontWeight: '800',
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: { width: '100%', flexDirection: 'row', alignItems: 'flex-end' },
  pill: { flexDirection: 'row', alignItems: 'center' },
  shareRow: { flexDirection: 'row', alignItems: 'center' },
  shareItem: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  shareCircle: { alignItems: 'center', justifyContent: 'center' },
});

export default forwardRef(AlbumFooterBarInner);
export { DEFAULT_STORAGE_LIMIT_BYTES, STORAGE_REMAINING_KEY };

