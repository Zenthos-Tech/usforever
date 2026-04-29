import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CloseIcon from '../assets/images/close.svg';
import CopyIcon from '../assets/images/copy.svg';
import ShareIcon from '../assets/images/sharelink.svg';

import ShareIcon2 from '../assets/images/link2.svg';
import { API_URL } from '../utils/api';
import {
  computeExpiresAtISO,
  formatPrettyDate,
} from '../utils/shareDuration';

const AUTH_TOKEN_KEY = 'USFOREVER_AUTH_TOKEN_V1';

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const joinUrl = (base, path) => {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
};


// Date helpers live in utils/shareDuration.js — used by share-access.js too.

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + Number(days || 0));
  return x;
}


const toValidId = (v) => {
  const s = String(v ?? '').trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
};
const toNumericId = toValidId;


export default function ShareModal({
  visible,
  onClose,
  shareType = 'family',
  expiryDate = '',
  accessType = 'nopass',
  passcode = '',
  duration = '3days',
  selectedDate = '',
  albumName = null,
  phone = '',
  weddingId = '',
  albumId = '',
}) {
  const [shareUrlDisplay, setShareUrlDisplay] = useState('');
  const [shareUrlFull, setShareUrlFull] = useState('');
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef(null);

  const showToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const t = useLayoutTokens() || {};
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const ui = useMemo(() => {
    const short = Math.min(W, H);
    const gutter = clamp(t?.gutter ?? t?.pad ?? W * 0.05, 12, 24);

    const vTight = clamp(H * 0.02, 10, 14);
    const vMed = clamp(H * 0.02, 14, 20);

    const radius = clamp(short * 0.045, 18, 26);

    const headerSize = clamp(W * 0.045, 16, 19);
    const labelSize = clamp(W * 0.035, 13, 15);
    const bodySize = clamp(W * 0.034, 12, 14.5);
    const btnTextSize = clamp(W * 0.04, 14, 16.5);

    const inputH = clamp(H * 0.065, 48, 58);
    const fieldRadius = clamp(short * 0.032, 12, 16);

    const icon = clamp(W * 0.05, 18, 22);
    const closeIcon = clamp(W * 0.065, 22, 26);

    const rowGap = clamp(gutter * 0.6, 10, 16);
    const innerPadH = clamp(gutter * 0.75, 12, 18);

    const shareBtnH = clamp(H * 0.062, 46, 52);
    const shareBorder = clamp(W * 0.0045, 1.2, 2);

    const safeBottom = Math.max(insets.bottom, clamp(H * 0.02, 10, 20));
    const overlayAlpha = 0.5;

    // ✅ Less height
    const sheetH = clamp(H * 0.5, H * 0.5, H * 0.5);

    return {
      W,
      H,
      gutter,
      vTight,
      vMed,
      radius,
      headerSize,
      labelSize,
      bodySize,
      btnTextSize,
      inputH,
      fieldRadius,
      icon,
      closeIcon,
      rowGap,
      innerPadH,
      shareBtnH,
      shareBorder,
      safeBottom,
      overlayAlpha,
      sheetH,
    };
  }, [t, insets.bottom, W, H]);

  // ✅ correct text for 3days: today + 3
  const expiryDisplayText = useMemo(() => {
    if (duration === 'nolimit') return 'No Limit';
    if (duration === '3days') return formatPrettyDate(addDays(new Date(), 3)) || '3 days';
    if (duration === 'date') return expiryDate || 'Selected date';
    return expiryDate || 'No Limit';
  }, [duration, expiryDate]);

  useEffect(() => {
    let cancelled = false;

    const generateLink = async () => {
      if (!visible) return;

      setShareUrlDisplay('');
      setShareUrlFull('');
      setGenerateError('');
      setLoading(true);

      try {
        const wid = String(weddingId || '').trim();
        const ph = String(phone || '').trim();

        const aidNum = toNumericId(albumId);

        if (!wid || ph.length < 4 || !aidNum) {
          setGenerateError('Missing album or wedding info. Please try again.');
          return;
        }

        const role = shareType === 'photographer' ? 'photographer' : 'guest';
        const expiresAt = computeExpiresAtISO(duration, selectedDate);

        const cleanPass = String(passcode || '').trim();
        const body = {
          phone: ph,
          role,
          weddingId: wid,
          albumId: aidNum,
          albumName: albumName ?? null,
          expiresAt,
          passcode: accessType === 'pass' ? cleanPass : null,
        };

        const url = joinUrl(API_URL, 'share-links/generate');
        const headers = await getAuthHeaders();

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const raw = await res.text();

        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { raw };
        }

        if (!res.ok) {
          if (res.status === 409 && data?.existingLink?.shareUrl) {
            if (!cancelled) setGenerateError('Link already exists.');
            return;
          }
          const msg = data?.error || data?.message || 'Failed to generate link.';
          if (!cancelled) setGenerateError(msg);
          return;
        }
        if (cancelled) return;

        const urlFromApi = data?.url || data?.shareUrl || data?.data?.url || '';
        if (!urlFromApi) return;

        const finalShare = urlFromApi;

        setShareUrlFull(finalShare);
        const masked = finalShare.replace(/^https?:\/\//, '').replace(/^www\./, '');
        setShareUrlDisplay(masked);
      } catch {
        if (!cancelled) setGenerateError('Failed to generate link. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generateLink();

    return () => {
      cancelled = true;
    };
  }, [visible, weddingId, albumId, phone, shareType, albumName, duration, selectedDate, accessType, passcode]);

const handleCopy = async () => {
  if (!shareUrlFull) return;
  await Clipboard.setStringAsync(shareUrlFull);
  showToast();
};

  const handleSharePress = async () => {
    if (!shareUrlFull) return;
    try {
      await Share.share({
        message: shareUrlFull,
        url: shareUrlFull,
        title: 'UsForever Album',
      });
    } catch {}
  };

  const infoLine =
    shareType === 'photographer'
      ? `Photographer can access the album only till ${expiryDisplayText}.`
      : `Family and friends can access the album only till ${expiryDisplayText}.`;

  // ✅ IMPORTANT: reserve only button space (NO safeBottom) so footer can touch bottom
  const footerH = ui.shareBtnH + 14;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { backgroundColor: hexToRgba(Colors.black, ui.overlayAlpha) }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.modalContainer,
            {
              height: ui.sheetH,
              borderTopLeftRadius: ui.radius,
              borderTopRightRadius: ui.radius,
              paddingTop: ui.vMed,
              paddingHorizontal: ui.gutter,
              paddingBottom: 0,
              backgroundColor: Colors.background,
              overflow: 'hidden',
            },
          ]}
          onPress={() => {}}
        >
          {/* HEADER — outside scroll so divider is always visible */}
          <View style={[styles.header, { marginBottom: ui.vMed }]}>
            <View style={{ width: ui.closeIcon }} />
            <Text style={[styles.headerTitle, { fontSize: ui.headerSize, color: Colors.textPrimary }]}>
              Share Access
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={clamp(ui.gutter * 0.5, 8, 14)}
              style={{ width: ui.closeIcon, alignItems: 'flex-end' }}
              activeOpacity={0.85}
            >
              <CloseIcon width={ui.closeIcon} height={ui.closeIcon} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { marginHorizontal: -ui.gutter }]} />

          {/* ✅ CONTENT */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: footerH }}>
            <Text style={[styles.label, { fontSize: ui.labelSize, marginTop: ui.vMed * 1.5, marginBottom: 4, color: "#364153" }]}>
              Share Link
            </Text>

            <View style={[styles.linkContainer, { marginBottom: ui.vMed }]}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    height: ui.inputH,
                    borderRadius: ui.fieldRadius,
                    paddingHorizontal: ui.innerPadH,
                    borderColor: Colors.border,
                    backgroundColor: Colors.background,
                  },
                ]}
              >
              <ShareIcon2
  width={ui.icon}
  height={ui.icon}
  color={Colors.textSecondary}
/>
                {loading ? (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: Colors.textSecondary, fontWeight: '700', fontSize: ui.bodySize }}>
                      Generating link…
                    </Text>
                  </View>
                ) : generateError ? (
                  <Text style={{ flex: 1, fontSize: ui.bodySize, color: Colors.danger ?? '#c00', fontWeight: '600' }}>
                    {generateError}
                  </Text>
                ) : (
                  <Text
                    pointerEvents="none"
                    style={[styles.input, { fontSize: ui.bodySize, color: Colors.textPrimary, textAlignVertical: 'center' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    selectable={false}
                  >
                    {shareUrlDisplay}
                  </Text>
                )}
              </View>

            <TouchableOpacity
  style={[
    styles.copyButton,
    {
      height: ui.inputH,
      width: ui.inputH * 0.7,
      borderRadius: ui.fieldRadius,
      paddingHorizontal: 0,
      marginLeft: ui.rowGap,
      borderColor: Colors.border,
      backgroundColor: Colors.background,
      opacity: shareUrlFull ? 1 : 0.5,
    },
  ]}
  onPress={handleCopy}
  activeOpacity={0.85}
  disabled={!shareUrlFull}
>
  <CopyIcon width={ui.icon} height={ui.icon} />
</TouchableOpacity>
            </View>

            <View
              style={[
                styles.infoBox,
                {
                  borderRadius: ui.fieldRadius,
                  paddingVertical: ui.vTight,
                  paddingHorizontal: ui.vMed,
                  marginTop: ui.vMed,
                  marginBottom: ui.vMed,
                  backgroundColor: '#F3F4F6',
                },
              ]}
            >
              <Text
                style={[
                  styles.info,
                  {
                    fontSize: clamp(W * 0.038, 13, 15.5),
                    lineHeight: Math.round(clamp(W * 0.038, 13, 15.5) * 1.45),
                    color: '#4A5565',
                  },
                ]}
              >
                {infoLine}
              </Text>
            </View>
          </ScrollView>

          {/* ✅ TRUE FOOTER: touches bottom of modal */}
          <View style={[styles.footer, { paddingHorizontal: ui.gutter }]}>
            <TouchableOpacity
              style={[
                styles.shareButton,
                {
                  height: ui.shareBtnH,
                  borderRadius: 16,
                  borderWidth: ui.shareBorder,
                  borderColor: Colors.textPrimary,
                  backgroundColor: Colors.background,
                  opacity: shareUrlFull ? 1 : 0.6,
                },
              ]}
              onPress={handleSharePress}
              activeOpacity={0.85}
              disabled={!shareUrlFull}
            >
              <ShareIcon width={ui.icon} height={ui.icon} />
              <Text style={[styles.shareButtonText, { fontSize: ui.btnTextSize, color: Colors.textPrimary }]}>
                Share Link
              </Text>
            </TouchableOpacity>
          </View>
          {/* Themed copy toast */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <View style={[styles.toastInner, { backgroundColor: Colors.primaryPink ?? '#E85A70' }]}>
              <Text style={styles.toastText}>Link copied to clipboard</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '00' },
  label: { fontWeight: '700' },
  linkContainer: { flexDirection: 'row', alignItems: 'center' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1 },
  copyButton: { borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#E0E0E0' },
  infoBox: {},
  info: {},
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
    paddingTop: 8,
  },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 10 },
  shareButtonText: { fontWeight: '800' },
});