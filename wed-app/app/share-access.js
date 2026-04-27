

import PinkCalendarModal from '@/components/Calendar';
import PrimaryButton from '@/components/PrimaryButton';
import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CalendarIcon from '../assets/images/calendar.svg';
import CloseIcon from '../assets/images/close.svg';
import ArrowIcon from '../assets/images/downicon2.svg';
import { useWedding } from '../context/WeddingContext';
import { formatSelectedDate } from '../utils/shareDuration';
import ShareModal from './share-link';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
}

const safeKeys = (obj) => {
  try {
    return obj && typeof obj === 'object' ? Object.keys(obj) : [];
  } catch {
    return [];
  }
};

const toValidId = (v) => {
  const s = String(v ?? '').trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
};
const toNumericId = toValidId;

export default function ShareAccessModal({
  visible,
  onClose,
  shareType = 'family', // 'photographer' or 'family' (guest)
  albumName = null,
  albumId: albumIdProp,
  weddingId: weddingIdProp,
  phone: phoneProp,
}) {
  const t = useLayoutTokens() || {};
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { weddingData } = useWedding();

  const [accessType, setAccessType] = useState('nopass');

  // ✅ Separate passcodes by shareType (guest vs photographer)
  const [guestPasscode, setGuestPasscode] = useState('');
  const [photographerPasscode, setPhotographerPasscode] = useState('');

  const [duration, setDuration] = useState('3days');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [dialog, setDialog] = useState({ visible: false, message: '' });

  // ✅ TRUE keyboard overlap (Modal-safe on Android)
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  // ✅ Active passcode for current role
  const passcode = shareType === 'photographer' ? photographerPasscode : guestPasscode;

  // ✅ only digits, max 4
  const setPasscode = (txt) => {
    const digits = String(txt || '').replace(/\D/g, '').slice(0, 4);
    if (shareType === 'photographer') setPhotographerPasscode(digits);
    else setGuestPasscode(digits);
  };

  const clearCurrentPasscode = () => {
    if (shareType === 'photographer') setPhotographerPasscode('');
    else setGuestPasscode('');
  };

  // ✅ Clear passcode when modal closes (so when they come back it's empty)
  const resetOnClose = () => {
    setShowDropdown(false);
    setShowCalendar(false);
    setSelectedDate('');
    setShowShareLinkModal(false);
    clearCurrentPasscode();
    // keep accessType as-is OR reset to nopass (your call). Keeping is nicer UX:
    // setAccessType('nopass');
  };

  useEffect(() => {
    const screenH = Dimensions.get('screen').height;

    const onFrame = (e) => {
      const end = e?.endCoordinates;
      if (!end) return setKeyboardOverlap(0);

      const keyboardTopY =
        typeof end.screenY === 'number' ? end.screenY : screenH - (end.height || 0);

      const overlap = Math.max(0, screenH - keyboardTopY);
      setKeyboardOverlap(overlap);
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

  const resolvedWeddingId = useMemo(() => {
    if (weddingIdProp !== undefined && weddingIdProp !== null && String(weddingIdProp).trim() !== '') {
      return String(weddingIdProp).trim();
    }
    const direct =
      pickFirst(weddingData, ['weddingId', 'id', '_id', 'weddingID', 'wedding_id', 'code', 'weddingCode']) ||
      null;
    return direct ? String(direct).trim() : null;
  }, [weddingIdProp, weddingData]);

  const resolvedPhone = useMemo(() => {
    const v =
      phoneProp ||
      pickFirst(weddingData, [
        'phone',
        'phoneNumber',
        'mobile',
        'mobileNumber',
        'couplePhone',
        'bridePhone',
        'groomPhone',
      ]) ||
      null;
    return v ? String(v).trim() : null;
  }, [phoneProp, weddingData]);

  const resolvedAlbumId = useMemo(() => {
    const direct = toNumericId(albumIdProp);
    if (direct) return direct;

    const targetName = String(albumName || '').trim().toLowerCase();
    const albums = weddingData?.albums;
    if (targetName && Array.isArray(albums)) {
      const hit = albums.find((a) => String(a?.name || '').trim().toLowerCase() === targetName);
      const hitId = toNumericId(hit?.id || hit?._id);
      if (hitId) return hitId;
    }
    return null;
  }, [albumIdProp, albumName, weddingData?.albums]);

  const ui = useMemo(() => {
    const short = Math.min(W, H);
    const gutter = clamp(t?.gutter ?? t?.pad ?? W * 0.05, 12, 24);

    const modalH = clamp(H * 0.87, H * 0.87, H * 0.87);
    const vTight = clamp(H * 0.008, 6, 10);
    const vMed = clamp(H * 0.012, 8, 12);
    const vBig = clamp(H * 0.01, 12, 18);

    const radius = clamp(short * 0.04, 16, 26);
    const fieldRadius = clamp(short * 0.03, 12, 18);

    const titleSize = clamp(W * 0.045, 16, 19);
    const sectionSize = clamp(W * 0.038, 13, 15);
    const optionSize = clamp(W * 0.042, 14, 17);
    const infoSize = clamp(W * 0.038, 13, 15.5);

    const inputH = clamp(H * 0.06, 46, 56);
    const iconSize = clamp(W * 0.08, 22, 26);
    const btnH = clamp(H * 0.07, 50, 60);
    const closeSize = clamp(W * 0.055, 18, 22);

    const dividerH = Math.max(StyleSheet.hairlineWidth, 1);

    const radioOuter = clamp(W * 0.055, 18, 22);
    const radioInner = clamp(radioOuter * 0.5, 8, 12);
    const radioBorder = clamp(W * 0.0045, 1.5, 2.5);
    const activeBorder = clamp(W * 0.0055, 1.8, 3);

    const fieldPadH = clamp(gutter * 1.05, 14, 22);

    const overlayAlpha = 0.5;

    return {
      gutter,
      modalH,
      vTight,
      vMed,
      vBig,
      radius,
      fieldRadius,
      titleSize,
      sectionSize,
      optionSize,
      infoSize,
      inputH,
      iconSize,
      btnH,
      closeSize,
      dividerH,
      radioOuter,
      radioInner,
      radioBorder,
      activeBorder,
      fieldPadH,
      overlayAlpha,
    };
  }, [t, W, H]);

  const overlapWin = Math.min(keyboardOverlap, H);
  const compact = overlapWin > 0;

  const closedBreathe = compact ? 0 : clamp(H * 0.015, 12, 20);

  const topGap = clamp(ui.gutter * 0.35, 10, 16);
  const availableH = Math.max(320, H - overlapWin - insets.top - topGap);
  const sheetH = Math.min(ui.modalH, availableH);

  const sheetLift = overlapWin;

  const btnHFinal = compact ? clamp(ui.btnH * 0.84, 44, ui.btnH) : ui.btnH;


  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const setDropdown = (open) => {
    Animated.timing(rotateAnim, {
      toValue: open ? 1 : 0,
      duration: clamp(H * 0.18, 160, 220),
      useNativeDriver: true,
    }).start();
    setShowDropdown(open);
  };

  // formatSelectedDate is imported from utils/shareDuration.js. Wrapping it
  // in a getDurationLabel here keeps the previous "3 Days" label rather than
  // collapsing to the absolute date — the dropdown UI prefers the literal.
  const getDurationLabel = () => {
    if (duration === '3days') return '3 Days';
    if (duration === 'nolimit') return 'No Limit';
    if (duration === 'date' && selectedDate) return formatSelectedDate(selectedDate);
    return 'Select Duration';
  };

  const Radio = ({ active }) => (
    <View
      style={[
        styles.radioOuter,
        {
          width: ui.radioOuter,
          height: ui.radioOuter,
          borderRadius: ui.radioOuter / 2,
          borderWidth: ui.radioBorder,
          borderColor: active ? Colors.textPrimary : Colors.border,
        },
      ]}
    >
      {active && (
        <View
          style={{
            width: ui.radioInner,
            height: ui.radioInner,
            borderRadius: ui.radioInner / 2,
            backgroundColor: Colors.textPrimary,
          }}
        />
      )}
    </View>
  );

  const handleGenerateShareLink = () => {
    if (!resolvedAlbumId) {
      Alert.alert(
        'Album not ready',
        `Your current album id is not a Strapi numeric id.\n\nFix: ensure folders come from server albums.\n\nSelected: ${String(albumIdProp)}`
      );
      return;
    }

    if (accessType === 'pass' && passcode.trim().length !== 4) {
      setDialog({ visible: true, message: 'Please enter a valid 4-digit passcode.' });
      return;
    }

    if (!resolvedWeddingId) {
      Alert.alert('Missing wedding', `weddingId not found.\nKeys: ${safeKeys(weddingData).join(', ') || 'none'}`);
      return;
    }

    if (!resolvedPhone || resolvedPhone.length < 4) {
      Alert.alert('Missing phone', 'phone not found in wedding profile (>=4 digits).');
      return;
    }

    // ✅ Open ShareModal
    setShowShareLinkModal(true);
  };

  const infoText =
    shareType === 'photographer'
      ? `Photographer can access the album\nonly till the selected date.`
      : `Family and friends can access the album\nonly till the selected date.`;

  const menuItems = ['3 Days', 'Select Date', 'No Limit'];

  const handleClose = () => {
    resetOnClose();
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable
        style={[
          styles.overlay,
          {
            backgroundColor: hexToRgba(Colors.black, ui.overlayAlpha),
          },
        ]}
        onPress={handleClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              height: sheetH,
              bottom: sheetLift,
              borderTopLeftRadius: ui.radius,
              borderTopRightRadius: ui.radius,
              backgroundColor: Colors.background,
              opacity: showShareLinkModal ? 0 : 1,
              flex: 1,
            },
          ]}
          onPress={() => {}}
        >
          <View
            style={[
              styles.header,
              { marginTop: compact ? 8 : ui.vBig, paddingTop: 6, marginHorizontal: ui.gutter },
            ]}
          >
            <View style={{ width: ui.closeSize }} />
            <Text style={[styles.title, { fontSize: ui.titleSize, color: Colors.textPrimary }]}>Share Access</Text>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.85}>
              <CloseIcon width={ui.closeSize} height={ui.closeSize} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: Colors.border, marginTop: compact ? 6 : ui.vBig }} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!compact}
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: ui.gutter,
              paddingTop: compact ? 0 : Math.round(closedBreathe * 0.35),
            }}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: ui.sectionSize,
                  marginTop: compact ? 4 : ui.vBig + closedBreathe * 0.25,
                  marginBottom: 4,
                  color: "#364153",

                },
              ]}
            >
              Access Type
            </Text>

            <TouchableOpacity
              style={[
                styles.optionBox,
                {
                  borderRadius: ui.fieldRadius,
                  height: ui.inputH,
                  paddingHorizontal: ui.fieldPadH,
                  marginBottom: 6,
                  borderColor: accessType === 'nopass' ? Colors.textPrimary : Colors.border,
                  borderWidth: accessType === 'nopass' ? ui.activeBorder : ui.radioBorder,
                  backgroundColor: Colors.background,
                },
              ]}
              onPress={() => {
                setAccessType('nopass');
                clearCurrentPasscode();
              }}
              activeOpacity={0.85}
            >
              <Radio active={accessType === 'nopass'} />
              <Text style={[styles.optionText, { fontSize: ui.optionSize, marginLeft: ui.vMed, color: Colors.textPrimary }]}>
                Share without passcode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBox,
                {
                  borderRadius: ui.fieldRadius,
                  height: ui.inputH,
                  paddingHorizontal: ui.fieldPadH,
                  marginBottom: 6,
                  borderColor: accessType === 'pass' ? Colors.textPrimary : Colors.border,
                  borderWidth: accessType === 'pass' ? ui.activeBorder : ui.radioBorder,
                  backgroundColor: Colors.background,
                },
              ]}
              onPress={() => setAccessType('pass')}
              activeOpacity={0.85}
            >
              <Radio active={accessType === 'pass'} />
              <Text style={[styles.optionText, { fontSize: ui.optionSize, marginLeft: ui.vMed, color: Colors.textPrimary }]}>
                Share with passcode
              </Text>
            </TouchableOpacity>

            {accessType === 'pass' && (
              <View style={{ marginBottom: compact ? 0 : ui.vMed + Math.round(closedBreathe * 0.35) }}>
                <Text
                  style={{
                    fontSize: ui.sectionSize,
                    color: "#364153",

                    fontWeight: '400',
                    marginBottom: 4,
                  }}
                >
                  Set Passcode
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      height: ui.inputH,
                      borderRadius: ui.fieldRadius,
                      paddingHorizontal: ui.fieldPadH,
                      fontSize: ui.optionSize,
                      borderColor: Colors.border,
                      backgroundColor: Colors.background,
                      color: Colors.textPrimary,
                    },
                  ]}
                  placeholder="Enter passcode"
                  placeholderTextColor={Colors.disabledGrey}
                  value={passcode}
                  onChangeText={setPasscode} // ✅ digits-only setter
                  keyboardType="numeric"
                  maxLength={4}
                  returnKeyType="done"
                />

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: ui.infoSize,
                    color:"#6A7282",

                    fontWeight: '400',
                  }}
                >
                  Share this passcode with the recipient
                </Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { fontSize: ui.sectionSize, marginTop: compact ? 0 : ui.vBig, marginBottom: 4, color: "#364153" }]}>
              Access Duration
            </Text>

            <TouchableOpacity
              style={[
                styles.dropdown,
                {
                  height: ui.inputH,
                  borderRadius: ui.fieldRadius,
                  paddingHorizontal: ui.fieldPadH,
                  borderColor: Colors.border,
                  backgroundColor: Colors.background,
                  marginBottom: compact ? 2 : 6 + Math.round(closedBreathe * 0.35),
                },
              ]}
              onPress={() => setDropdown(!showDropdown)}
              activeOpacity={0.85}
            >
              <Text style={[styles.dropdownText, { fontSize: ui.optionSize, color: Colors.textPrimary }]}>
                {getDurationLabel()}
              </Text>

              <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
             <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
  <ArrowIcon
    width={ui.iconSize}
    height={ui.iconSize}
    color={Colors.textSecondary}
    opacity={0.85}
  />
</Animated.View>
              </Animated.View>
            </TouchableOpacity>

            {showDropdown && (
              <View
                style={[
                  styles.menu,
                  {
                    borderRadius: ui.fieldRadius,
                    marginTop: -2,
                    borderColor: Colors.border,
                    backgroundColor: Colors.background,
                  },
                ]}
              >
                {menuItems.map((item, idx) => (
                  <React.Fragment key={item}>
                    <TouchableOpacity
                      style={{ paddingVertical: ui.vTight, paddingHorizontal: ui.fieldPadH, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (item === 'Select Date') {
                          setShowCalendar(true);
                        } else {
                          setDuration(item === '3 Days' ? '3days' : 'nolimit');
                          setSelectedDate('');
                        }
                        setDropdown(false);
                      }}
                    >
                      {item === 'Select Date' && <CalendarIcon width={ui.iconSize * 0.85} height={ui.iconSize * 0.85} color={Colors.textPrimary} />}
                      <Text style={{ fontSize: ui.optionSize, color: Colors.textPrimary }}>{item}</Text>
                    </TouchableOpacity>

                    {idx < menuItems.length - 1 && <View style={{ height: ui.dividerH, backgroundColor: Colors.border }} />}
                  </React.Fragment>
                ))}
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: ui.gutter,
                paddingTop: compact ? 4 : ui.vTight,
                paddingBottom: compact ? 4 : Math.max(insets.bottom, 12),
                backgroundColor: Colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.infoBox,
                {
                  borderRadius: ui.fieldRadius,
                  paddingVertical: compact ? 4 : ui.vTight,
                  paddingHorizontal: compact ? 6 : ui.vMed,
                  marginBottom: compact ? 2 : ui.vTight + Math.round(closedBreathe * 0.2),
                  transform: compact ? [] : [{ translateY: -10 }],
                  backgroundColor: '#F3F4F6',
                },
              ]}
            >
              <Text style={[styles.info, { fontSize: ui.infoSize, color: "#4A5565"
 }]}>
                {infoText}
              </Text>
            </View>

            <PrimaryButton title="Generate Share Link" onPress={handleGenerateShareLink} height={btnHFinal} enabled={true} />
          </View>

          <PinkCalendarModal
            visible={showCalendar}
            onClose={() => setShowCalendar(false)}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setDuration('date');
              setShowCalendar(false);
            }}
          />

          <Modal
            visible={dialog.visible}
            transparent
            animationType="fade"
            onRequestClose={() => setDialog({ visible: false, message: '' })}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setDialog({ visible: false, message: '' })}
            >
              <Pressable
                onPress={() => {}}
                style={{
                  backgroundColor: Colors.background,
                  borderRadius: 20,
                  paddingVertical: 28,
                  paddingHorizontal: 28,
                  width: '78%',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: '#FFF0F3',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryPink, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 22 }}>!</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 22 }}>
                  {dialog.message}
                </Text>
                <TouchableOpacity
                  onPress={() => setDialog({ visible: false, message: '' })}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: Colors.primaryPink,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 36,
                    alignSelf: 'stretch',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>OK</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          <ShareModal
            visible={showShareLinkModal}
            onClose={() => {
              setShowShareLinkModal(false);
              clearCurrentPasscode();
              handleClose();
            }}
            shareType={shareType}
            expiryDate={getDurationLabel()}
            accessType={accessType}
            passcode={passcode} // ✅ passcode used for THIS generate action
            // ✅ NEW: explicit link flags for web photographer screen
            protected={accessType === 'pass'}
            pc={accessType === 'pass' ? passcode.trim() : ''}
            duration={duration}
            selectedDate={selectedDate}
            albumId={resolvedAlbumId}
            albumName={albumName}
            phone={resolvedPhone}
            weddingId={resolvedWeddingId}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },

  footer: {},

  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: '500' },
  closeBtn: { position: 'absolute', right: 0 },

  sectionTitle: { fontWeight: '400' },
  optionBox: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontWeight: '400' },
  radioOuter: { justifyContent: 'center', alignItems: 'center' },

  input: { borderWidth: 1 },

  dropdown: { borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontWeight: '400' },
  menu: { borderWidth: 1 },

  infoBox: {},
  info: {  fontWeight: '400' },
});