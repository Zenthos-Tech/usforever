// app/home.js

import PrimaryButton from '@/components/PrimaryButton';
import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

import { API_URL } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useImages } from '../context/ImagesContext';
import { useWedding } from '../context/WeddingContext';

/** ✅ SVG fallback */
import AboutIcon from '../assets/images/about.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useLayoutTokens();

  const { weddingData, hydrated, profilePhotoUri, setProfilePhotoUri } = useWedding();
  const { setRole } = useImages();
  const photoFetchedRef = useRef(false);

  // Fetch profile photo from backend on mount
  useEffect(() => {
    if (!hydrated || photoFetchedRef.current) return;
    const wid = String(weddingData?.weddingId || '').trim();
    if (!wid) return;

    photoFetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/photos/profile-photo?weddingId=${wid}`);
        const data = await res.json();
        const url = data?.data?.url || '';
        if (url) setProfilePhotoUri(url);
      } catch {}
    })();
  }, [hydrated, weddingData?.weddingId]);

  const W = t.W || 390;
  const v1 = t.v1 || 10;
  const v2 = t.v2 || 18;
  const gutter = typeof t.gutter === 'number' ? t.gutter : 18;

  useEffect(() => {
    if (hydrated === false) return;

    const phone = String(weddingData?.phone || '').trim();
    const weddingId = String(weddingData?.weddingId || '').trim();

    if (!phone) {
      router.replace('/signin');
      return;
    }

    if (!weddingId) {
      router.replace('/setup-wedding');
      return;
    }
  }, [hydrated, weddingData?.phone, weddingData?.weddingId, router]);

  const aboutSize = useMemo(() => clamp(W * 0.09, W * 0.07, W * 0.085), [W]);

  const iconsDown = useMemo(() => clamp(v2 * 1.4, 20, 36), [v2]);
  const topOffset = useMemo(() => insets.top + iconsDown, [insets.top, iconsDown]);

  const titleSize = useMemo(() => clamp(W * 0.055, W * 0.045, W * 0.07), [W]);
  const dateSize = useMemo(() => clamp(W * 0.038, W * 0.032, W * 0.046), [W]);

  const emptyTitleSize = useMemo(() => clamp(W * 0.048, W * 0.04, W * 0.058), [W]);
  const emptySubSize = useMemo(() => clamp(W * 0.036, W * 0.03, W * 0.044), [W]);

  const btnH = useMemo(
    () => clamp((t.H || 844) * 0.065, (t.H || 844) * 0.055, (t.H || 844) * 0.075),
    [t.H]
  );

  const headerGap = useMemo(() => clamp(v2 * 1.0, v2 * 0.8, v2 * 1.3), [v2]);
  const textGap = useMemo(() => clamp(v1 * 0.45, v1 * 0.35, v1 * 0.7), [v1]);
  const ctaGap = useMemo(() => clamp(v2 * 0.9, v2 * 0.7, v2 * 1.2), [v2]);

  const openAlbumForCouple = () => {
    setRole('couple');
    router.push('/create-album');
  };

  const goToAbout = () => {
    router.push('../profile');
  };

  const normalizeName = (v) =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim();

  const bride = normalizeName(weddingData?.brideName || 'Bride');
  const groom = normalizeName(weddingData?.groomName || 'Groom');
  const date = weddingData?.weddingDate || 'Wedding Date';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* ✅ About icon */}
      <View style={[styles.topRight, { top: topOffset, right: gutter }]}>
        <TouchableOpacity
          onPress={goToAbout}
          activeOpacity={0.85}
          hitSlop={12}
          style={[
            styles.aboutCircle,
            {
              width: aboutSize,
              height: aboutSize,
              borderRadius: aboutSize / 2,
            
            },
          ]}
        >
          {profilePhotoUri ? (
            // 🔥 Keep Image ONLY when dynamic photo exists
            <Image
              source={{ uri: profilePhotoUri }}
              style={styles.aboutFillImg}
            />
          ) : (
            // ✅ SVG fallback
            <AboutIcon
  width="100%"
  height="100%"
  style={{ position: 'absolute' }}
/>
          )}
        </TouchableOpacity>
      </View>

      {/* Page */}
      <View style={{ flex: 1, paddingHorizontal: gutter }}>
        {/* Header */}
        <View style={{ paddingTop: headerGap }}>
          <Text
            style={[
              styles.coupleNames,
              { fontSize: titleSize, color: Colors.textPrimary },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {bride} & {groom}
          </Text>

          <Text
            style={[
              styles.weddingDate,
              {
                marginTop: textGap,
                fontSize: dateSize,
                color: "#2D2A2B",
                fontWeight:300

              },
            ]}
          >
            {date}
          </Text>
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyTitle,
              { fontSize: emptyTitleSize, color:"#6C7278"
 },
            ]}
          >
            No photos and videos available
          </Text>

          <Text
            style={[
              styles.emptySubtitle,
              {
                fontSize: emptySubSize,
                color: "#666263",

                marginTop: textGap * 0.65,
              },
            ]}
          >
            (Start uploading or invite your photographer)
          </Text>

          <View style={{ width: '100%', marginTop: ctaGap }}>
            <PrimaryButton
              title="CREATE A ALBUM"
              onPress={openAlbumForCouple}
              enabled
              height={btnH}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topRight: {
    position: 'absolute',
    zIndex: 10,
  },

  aboutCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  aboutFillImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  coupleNames: { fontWeight: '800' },
  weddingDate: { fontWeight: '500' },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },

  emptySubtitle: {
    fontWeight: '500',
    textAlign: 'center',
  },
});