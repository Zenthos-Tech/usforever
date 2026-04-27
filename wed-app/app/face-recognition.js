import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../utils/api';

import PrimaryButton from '@/components/PrimaryButton';
import CameraIcon from '../assets/images/camera.svg';
import CloseIcon from '../assets/images/close.svg';
import UploadIcon from '../assets/images/upload2.svg';
import { useImages } from '../context/ImagesContext';
import { useWedding } from '../context/WeddingContext';
import Colors from '../theme/colors';

const AUTH_TOKEN_KEY = 'USFOREVER_AUTH_TOKEN_V1';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function FaceRecognitionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { weddingId } = useWedding() || {};
  // Guests pick up the share-access accessToken from ImagesContext after the
  // /resolve handshake. Couples use the user JWT from AsyncStorage. We try
  // the guest token first so a logged-in couple following someone else's
  // share link still uses the correct token for the shared wedding.
  const { shareAccess } = useImages() || {};

  const [imageAsset, setImageAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const imageUri = imageAsset?.uri ?? null;

  const short = Math.min(W, H);
  const pad = useMemo(() => clamp(short * 0.06, 16, 24), [short]);
  const cardH = useMemo(() => H * 0.8, [H]);
  const titleSize = useMemo(() => clamp(W * 0.044, 16, 18), [W]);
  const btnHeight = useMemo(() => clamp(H * 0.065, 46, 54), [H]);

  const pink = Colors?.primaryPink ?? Colors?.primary ?? '#F56786';
  const text = Colors?.textPrimary ?? Colors?.text ?? '#222222';
  const muted = Colors?.textSecondary ?? '#7A7A7A';
  const border = Colors?.border ?? '#E7E7E7';
  const white = Colors?.white ?? '#FFFFFF';

  const onClose = () => router.back();

  const compressImage = async (asset) => {
    try {
      const width = asset?.width || 0;
      const height = asset?.height || 0;

      let targetWidth = width;
      if (width > 1280) {
        targetWidth = 1280;
      }

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        targetWidth && width ? [{ resize: { width: targetWidth } }] : [],
        {
          compress: 0.35,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return {
        ...asset,
        uri: manipulated.uri,
        mimeType: 'image/jpeg',
        fileName: `face_${Date.now()}.jpg`,
      };
    } catch (e) {
      console.log('compressImage error:', e);
      return asset;
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length) {
        const compressed = await compressImage(result.assets[0]);
        setImageAsset(compressed);
        await searchFace(compressed);
      }
    } catch (e) {
      console.log('openCamera error:', e);
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Gallery access is needed.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.35,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets?.length) {
        const compressed = await compressImage(result.assets[0]);
        setImageAsset(compressed);
        await searchFace(compressed);
      }
    } catch (e) {
      console.log('openGallery error:', e);
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  const searchFace = async (asset) => {
    try {
      if (!weddingId) {
        Alert.alert('Missing wedding', 'Wedding ID not found.');
        return;
      }

      if (!asset?.uri) {
        Alert.alert('Missing photo', 'Please select a photo first.');
        return;
      }

      setLoading(true);

      const fileName = asset.fileName || `face_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      const formData = new FormData();
      formData.append('weddingId', String(weddingId));
      formData.append('image', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });

      const guestAccessToken = String(shareAccess?.accessToken || '').trim();
      const userJwt = guestAccessToken
        ? ''
        : String((await AsyncStorage.getItem(AUTH_TOKEN_KEY)) || '').trim();
      const bearer = guestAccessToken || userJwt;

      const response = await fetch(`${API_URL}/face/search`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: formData,
      });

      const rawText = await response.text();
      console.log('face/search raw response:', rawText);

      let json = null;
      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        json = null;
      }

      if (!response.ok) {
        const message =
          json?.error?.message ||
          json?.message ||
          rawText ||
          'Face search failed. Please try again.';
        throw new Error(message);
      }

      const matchedPhotos = json?.data?.photos || [];
      const count = Number(json?.data?.count || 0);

      router.push({
        pathname: '/face-result',
        params: {
          photos: JSON.stringify(matchedPhotos),
          selfieUri: asset.uri,
          count: String(count),
        },
      });
    } catch (error) {
      console.log('face.search error', error);
      Alert.alert(
        'Face search failed',
        error?.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View
        style={[
          styles.card,
          {
            height: cardH,
            paddingBottom: insets.bottom + 10,
            backgroundColor: white,
          },
        ]}
      >
        <View style={[styles.header, { paddingHorizontal: pad, paddingTop: pad }]}>
          <Text style={[styles.headerTitle, { fontSize: titleSize, color: text }]}>
            Add your photo
          </Text>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={10}
            disabled={loading}
          >
            <CloseIcon width={18} height={18} />
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: border }]} />

        <View
          style={[
            styles.content,
            {
              paddingHorizontal: pad,
              paddingTop: pad,
            },
          ]}
        >
          <View
            style={[
              styles.previewBox,
              {
                borderColor: border,
              },
            ]}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderWrap}>
                <Text style={[styles.placeholderText, { color: muted }]}>
                  Photo preview
                </Text>
              </View>
            )}

            {loading ? (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="large" color={pink} />
                <Text style={[styles.loaderText, { color: text }]}>
                  Finding your photos...
                </Text>
              </View>
            ) : null}
          </View>
<View style={styles.primaryButtonWrap}>
  <PrimaryButton
    title="" // ✅ remove internal text
    onPress={openCamera}
    enabled={!loading}
    height={btnHeight}
    radius={14}
    style={styles.primaryButton}
  />

  {/* ✅ Single visible content */}
  <View style={styles.primaryContent}>
    <CameraIcon width={16} height={16} />
    <Text style={styles.primaryBtnText}>
      {loading ? 'SEARCHING...' : 'ALLOW & CONTINUE'}
    </Text>
  </View>
</View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openGallery}
            disabled={loading}
            style={[
              styles.secondaryBtn,
              {
                height: btnHeight,
                borderRadius: 14,
                marginTop: 10,
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.btnInner}>
              <UploadIcon width={16} height={16} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryBtnText}>UPLOAD FROM DEVICE</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: muted }]}>
            A clear, front-facing photo works best.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000055',
  },
  card: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    marginBottom: 12,
    position: 'relative',
  },
  headerTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  closeBtn: {
    position: 'absolute',
    right: 18,
    top: '50%',
    marginTop: 15,
    height: 20,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginTop: 10,
  },
  content: {
  flex: 1,
  justifyContent: 'flex-start', // 👈 IMPORTANT
},
  previewBox: {
    width: '100%',
    flex: 1,
    minHeight: 220,
    maxHeight: 360,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#F8F8F8',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  primaryContent: {
  position: 'absolute',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
},
  placeholderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFFCC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButtonWrap: {
    marginTop: 18,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
  },
  primaryButtonIcon: {
    position: 'absolute',
    zIndex: 2,
    left: 18,
    top: '50%',
    marginTop: -8,
    pointerEvents: 'none',
  },
  secondaryBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFFFFF',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryBtnText: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '400',
  },
});