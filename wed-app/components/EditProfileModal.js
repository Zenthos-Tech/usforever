// components/EditProfileModal.js
// ✅ Default avatar for everyone
// ✅ Profile photo saved PER phone number (no leaking between logins)
// ✅ If user changes photo, only that user (that phone) sees it on next login
// ✅ UI unchanged
// ✅ Icons converted to SVG

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Calendar from '@/components/Calendar';
import PrimaryButton from '@/components/PrimaryButton';
import { useWedding } from '@/context/WeddingContext';
import Colors from '@/theme/colors';
import { API_URL } from '@/utils/api';
import { getAuthToken } from '@/utils/authToken';
import CalendarIcon from '../assets/images/calendar.svg';
import ExportIcon from '../assets/images/export.svg';
import AboutSvg from '../assets/images/about.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const pad2 = (n) => String(n).padStart(2, '0');

const PROFILE_PHOTO_KEY_PREFIX = 'USFOREVER_PROFILE_PHOTO_V1:'; // per-phone

const toDDMMYYYY = (v) => {
  if (!v) return '';
  if (v instanceof Date) {
    const d = pad2(v.getDate());
    const m = pad2(v.getMonth() + 1);
    const y = v.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const s = String(v).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}-${m}-${y}`;
  }
  return s;
};

const pickFirst = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
};

const normalizePhone = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  const digits = s.replace(/[^\d]/g, '');
  return digits || s;
};

export default function EditProfileModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();

  const {
    weddingData,
    brideName: ctxBride,
    groomName: ctxGroom,
    weddingDate: ctxDate,
    profilePhotoUri: ctxPhoto,
    setBrideName,
    setGroomName,
    setWeddingDate,
    setProfilePhotoUri,
  } = useWedding();

  const resolvedPhone = useMemo(() => {
    const raw =
      pickFirst(weddingData, [
        'phone',
        'phoneNumber',
        'mobile',
        'mobileNumber',
        'couplePhone',
        'bridePhone',
        'groomPhone',
      ]) || '';
    return normalizePhone(raw);
  }, [weddingData]);

  const photoStorageKey = useMemo(() => {
    return PROFILE_PHOTO_KEY_PREFIX + (resolvedPhone || 'NO_PHONE');
  }, [resolvedPhone]);

  const [brideName, setBrideNameLocal] = useState(ctxBride || '');
  const [groomName, setGroomNameLocal] = useState(ctxGroom || '');
  const [weddingDate, setWeddingDateLocal] = useState(ctxDate || '');

  const [photoUri, setPhotoUri] = useState(() => String(ctxPhoto || '').trim());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [imgKey, setImgKey] = useState(0);

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

    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const frameEvt = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, onFrame);
    const frameSub = Keyboard.addListener(frameEvt, onFrame);
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardOverlap(0));

    return () => {
      showSub?.remove?.();
      frameSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

  const prevVisibleRef = useRef(false);

  useEffect(() => {
    // Never interfere while the image picker is active
    if (isPickingRef.current) return;

    const justOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = !!visible;

    if (!justOpened) return;

    setBrideNameLocal(ctxBride || '');
    setGroomNameLocal(ctxGroom || '');
    setWeddingDateLocal(ctxDate || '');
    pendingPhotoRef.current = null;

    let alive = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(photoStorageKey);
        if (!alive) return;

        const uri = String(stored || '').trim();
        if (uri) {
          // Found a locally stored photo — use it
          setPhotoUri(uri);
          setImgKey((k) => k + 1);
          setProfilePhotoUri?.(uri);
        } else {
          // Nothing in AsyncStorage — fall back to context, never reset to empty
          const fallback = String(ctxPhoto || '').trim();
          setPhotoUri(fallback);
          setImgKey((k) => k + 1);
        }
      } catch {
        if (!alive) return;
        // On error keep whatever is already showing — don't wipe the photo
        const fallback = String(ctxPhoto || '').trim();
        setPhotoUri(fallback);
        setImgKey((k) => k + 1);
      }
    })();

    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const [uploading, setUploading] = useState(false);
  const pendingPhotoRef = useRef(null);
  const isPickingRef = useRef(false); // prevents useEffect from resetting photo while picker is open

const pickImage = async () => {
  if (isPickingRef.current) return;
  isPickingRef.current = true;

  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.95,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (res.canceled) return;

    const asset = res.assets?.[0];
    const tempUri = asset?.uri;
    if (!tempUri) return;

    let permUri = tempUri;
    try {
      const dir = FileSystem.documentDirectory + 'profile_photos/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const safe = String(resolvedPhone || 'default').replace(/[^\w]/g, '_');
      const dest = `${dir}profile_${safe}.jpg`;
      await FileSystem.copyAsync({ from: tempUri, to: dest });
      permUri = dest;
    } catch {}

    setPhotoUri(permUri);
    setImgKey((k) => k + 1);
    pendingPhotoRef.current = { ...asset, uri: permUri };

    // Persist immediately so a remount during Android lifecycle restores the photo
    try {
      await AsyncStorage.setItem(photoStorageKey, permUri);
      setProfilePhotoUri?.(permUri);
    } catch {}
  } finally {
    isPickingRef.current = false;
  }
};

  const uploadProfilePhotoToS3 = async (asset) => {
    const wid = String(weddingData?.weddingId || '').trim();
    if (!wid || !API_URL) return null;

    const uri = asset.uri;
    const fileName = asset.fileName || uri.split('/').pop() || 'profile.jpg';
    const mimeType = asset.mimeType || 'image/jpeg';

    // Step 1: Get presigned URL (auth required)
    const authToken = await getAuthToken();
    const presignRes = await fetch(`${API_URL}/photos/profile-photo/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        weddingId: wid,
        originalFileName: fileName,
        mimeType,
      }),
    });

    const presignData = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignData?.error?.message || 'Presign failed');

    const { uploadUrl } = presignData?.data || {};
    if (!uploadUrl) throw new Error('No uploadUrl returned');

    // Step 2: Upload file to S3
    const fileRes = await fetch(uri);
    const blob = await fileRes.blob();

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: blob,
    });

    if (!putRes.ok) throw new Error('S3 upload failed');

    return presignData.data.key;
  };

  const onSave = async () => {
    const phone = String(weddingData?.phone || '').trim();
    const formattedDate = toDDMMYYYY(weddingDate);

    // 1. Update local context immediately
    setBrideName?.(brideName);
    setGroomName?.(groomName);
    setWeddingDate?.(formattedDate);

    // 2. Save photo locally first (so it never gets lost)
    const finalUri = String(photoUri || '').trim();
    try {
      if (finalUri) await AsyncStorage.setItem(photoStorageKey, finalUri);
      else await AsyncStorage.removeItem(photoStorageKey);
    } catch {
      console.log("Hye error");
    }
    setProfilePhotoUri?.(finalUri);

    // 3. Sync names/date to backend via /create-wedding
    if (phone && API_URL) {
      try {
        await fetch(`${API_URL}/create-wedding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brideName: brideName.trim(),
            groomName: groomName.trim(),
            weddingDate: formattedDate,
            phone,
          }),
        });
      } catch (err) {
        console.error('Failed to sync profile to backend:', err);
      }
    }

    // 4. Upload profile photo to S3 and refresh context with a fresh signed URL
    if (pendingPhotoRef.current) {
      try {
        setUploading(true);
        const wid = String(weddingData?.weddingId || '').trim();
        const s3Key = await uploadProfilePhotoToS3(pendingPhotoRef.current);
        if (s3Key && wid && API_URL) {
          const readToken = await getAuthToken();
          const readRes = await fetch(
            `${API_URL}/photos/profile-photo?weddingId=${wid}`,
            readToken ? { headers: { Authorization: `Bearer ${readToken}` } } : undefined
          );
          const readData = await readRes.json();
          const signedUrl = readData?.data?.url || '';
          if (signedUrl) {
            // Update context with backend URL for current session.
            // photoStorageKey keeps the permanent local file as offline fallback.
            setProfilePhotoUri?.(signedUrl);
          }
        }
      } catch (err) {
        console.error('Profile photo S3 upload failed, local copy saved:', err);
      } finally {
        setUploading(false);
        pendingPhotoRef.current = null;
      }
    }

    onClose?.();
  };

  const onPickDate = (picked) => {
    setWeddingDateLocal(toDDMMYYYY(picked));
    setCalendarOpen(false);
  };

  const winH = Dimensions.get('window').height;
  const overlapWin = Math.min(keyboardOverlap, winH);
  const compact = overlapWin > 0;

  const baseH = useMemo(() => clamp(winH * 0.9, 520, 780), [winH]);
  const availableH = Math.max(320, winH - overlapWin - insets.top - 10);
  const sheetH = Math.min(baseH, availableH);

  const sheetLift = overlapWin;
  const footerPadBottom = compact ? 0 : Math.max(insets.bottom, 12);

  const inputH = 42;
  const dateRowH = 35;

  const headerH = compact ? 38 : 46;

  const photoWrapSize = compact ? 54 : 82;
  const avatarSize = compact ? 44 : 64;

  const exportBtnSize = compact ? 30 : 35;
  const exportOffset = -(exportBtnSize * 0.3);

  const photoPadTop = compact ? 6 : 14;
  const photoPadBottom = compact ? 2 : 8;

  const formPadTop = compact ? 2 : 8;
  const labelMB = compact ? 4 : 8;
  const betweenFields = compact ? 6 : 14;

  const footerTopPad = compact ? 8 : 14;
  const footerGap = compact ? 4 : 10;
  const btnH = compact ? 46 : undefined;
  const cancelH = compact ? 36 : 44;

  const FOOTER_RESERVE =
    footerTopPad + (btnH || 52) + footerGap + cancelH + footerPadBottom + 10;

  return (
    <>
      <Calendar
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDate={onPickDate}
        onSelect={onPickDate}
      />

      <Modal visible={!!visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
  onStartShouldSetResponder={() => true}
          style={[
            styles.sheet,
            {
              height: sheetH,
              bottom: sheetLift,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: 18,
            },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.header, { height: headerH, marginTop: compact ? 2 : 8 }]}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.divider,
              {
                marginHorizontal: -18,
                width: 'auto',
              },
            ]}
          />

          <View style={[styles.content, { paddingBottom: FOOTER_RESERVE }]}>
            <View style={[styles.photoBlock, { paddingTop: photoPadTop, paddingBottom: photoPadBottom }]}>
              <View style={[styles.photoWrap, { width: photoWrapSize, height: photoWrapSize }]}>
                <View
                  style={[
                    styles.avatarHost,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.avatarClip,
                      {
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: avatarSize / 2,
                      },
                    ]}
                  >
                    {photoUri ? (
                   <Image
                      key={`avatar-${imgKey}`}
                      source={{ uri: photoUri }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                    ) : (
                      <View style={styles.avatarSvgWrap}>
                        <AboutSvg width={avatarSize} height={avatarSize} />
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={pickImage}
                    activeOpacity={0.85}
                    style={[
                      styles.exportBtn,
                      {
                        width: exportBtnSize,
                        height: exportBtnSize,
                        borderRadius: exportBtnSize / 2,
                        right: exportOffset,
                        bottom: exportOffset,
                      },
                    ]}
                  >
                    <ExportIcon width={exportBtnSize} height={exportBtnSize} />
                  </TouchableOpacity>
                </View>
              </View>

              {!compact && <Text style={styles.changePhoto}>Change Profile Photo</Text>}
            </View>

            <View style={[styles.form, { paddingTop: formPadTop }]}>
              <Text style={[styles.label, { marginBottom: labelMB }]}>Bride Name</Text>
              <View style={[styles.inputWrap, { height: inputH }]}>
                <TextInput
                  value={brideName}
                  onChangeText={setBrideNameLocal}
                  placeholder="Bride Name"
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { marginTop: betweenFields, marginBottom: labelMB }]}>
                Groom Name
              </Text>
              <View style={[styles.inputWrap, { height: inputH }]}>
                <TextInput
                  value={groomName}
                  onChangeText={setGroomNameLocal}
                  placeholder="Groom Name"
                  placeholderTextColor="#9A9A9A"
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>

              <Text style={[styles.label, { marginTop: betweenFields, marginBottom: labelMB }]}>
                Wedding Date
              </Text>

              <View style={[styles.dateRow, { height: dateRowH }]}>
                <TextInput
                  value={weddingDate}
                  onChangeText={setWeddingDateLocal}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#9A9A9A"
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                />

                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setCalendarOpen(true);
                  }}
                  hitSlop={10}
                  style={styles.calendarBtn}
                >
                  <CalendarIcon width={18} height={18} />
                </TouchableOpacity>
              </View>

              <View style={styles.underline} />
            </View>
          </View>

          <View style={[styles.footer, { paddingTop: footerTopPad, paddingBottom: footerPadBottom }]}>
            <PrimaryButton title={uploading ? "Uploading..." : "Save Changes"} onPress={onSave} height={btnH} enabled={!uploading} />
            <View style={{ height: footerGap }} />
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { height: cancelH }]} activeOpacity={0.85}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },

  header: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'System', fontWeight: '600', color: '#111' },
  closeBtn: {
    position: 'absolute',
    right: 4,
    top: 2,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 26, color: '#333', lineHeight: 26 },

  divider: { height: 1, backgroundColor: '#E7E7E7' },

  content: { flex: 1 },

  photoBlock: { alignItems: 'center' },

  avatarHost: {
    position: 'relative',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarClip: {
    overflow: 'hidden',
    backgroundColor: '#F2F2F2',
  },

  avatarSvgWrap: {
    width: '100%',
    height: '100%',
  },

  photoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  avatar: { width: '100%', height: '100%' },

  exportBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },

  changePhoto: {
    marginTop: 6,
    fontSize: 13,
    color: Colors?.primaryPink || '#FF6C86',
    fontWeight: '500',
  },

  form: {},
  label: { fontSize: 13, color: '#333', fontWeight: '500' },

  inputWrap: {
    borderWidth: 1,
    borderColor: '#CFCFCF',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  input: { fontSize: 16, color: '#222', paddingVertical: 0 },

  dateRow: { flexDirection: 'row', alignItems: 'center' },
  calendarBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  underline: { height: 1, backgroundColor: '#2C2C2C', marginTop: 6, opacity: 0.6 },

  footer: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: { alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { color: '#9A9A9A', fontSize: 13, fontWeight: '500' },
});