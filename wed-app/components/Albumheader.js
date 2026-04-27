// components/Albumheader.js

import { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWedding } from '@/context/WeddingContext';
import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

/** ✅ SVG icons */
import AboutIcon from '../assets/images/about.svg';
import CastIcon from '../assets/images/cast.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function AlbumHeader({ weddingData, onCastPress, onAboutPress }) {
  const insets = useSafeAreaInsets();
  const t = useLayoutTokens() || {};
  const { profilePhotoUri } = useWedding();

  const W = t.W || 390;
  const v1 = t.v1 || 10;
  const v2 = t.v2 || 18;
  const gutter = typeof t.gutter === 'number' ? t.gutter : 18;

  const aboutSize = useMemo(() => clamp(W * 0.09, W * 0.07, W * 0.085), [W]);
  const castSize = useMemo(() => clamp(W * 0.06, W * 0.05, W * 0.07), [W]);

  const iconGap = useMemo(() => clamp(v1 * 0.55, v1 * 0.45, v1 * 0.85), [v1]);

  const iconsUp = useMemo(() => clamp(v2 * 0.6, v2 * 0.45, v2 * 0.9), [v2]);
  const topOffset = useMemo(() => Math.max(0, insets.top - iconsUp), [insets.top, iconsUp]);

  const titleSize = useMemo(() => clamp(W * 0.055, W * 0.045, W * 0.07), [W]);
  const dateSize = useMemo(() => clamp(W * 0.038, W * 0.032, W * 0.046), [W]);

  const headerGap = useMemo(() => clamp(v2 * 1.0, v2 * 0.8, v2 * 1.3), [v2]);
  const textGap = useMemo(() => clamp(v1 * 0.45, v1 * 0.35, v1 * 0.7), [v1]);

  const bride = weddingData?.brideName || 'Bride';
  const groom = weddingData?.groomName || 'Groom';
  const date = weddingData?.weddingDate || 'Wedding Date';

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Top-right icons */}
      <View style={[styles.topRight, { top: topOffset, right: gutter }]}>
        {!!onCastPress && (
          <TouchableOpacity onPress={onCastPress} activeOpacity={0.85} hitSlop={12}>
            <CastIcon width={castSize} height={castSize} style={{ color: Colors.textPrimary, marginRight: 2 }} />
          </TouchableOpacity>
        )}

        {!!onAboutPress && (
          <TouchableOpacity
            onPress={onAboutPress}
            activeOpacity={0.85}
            hitSlop={12}
            style={[
              styles.aboutCircle,
              {
                marginLeft: onCastPress ? iconGap : 0,
                width: aboutSize,
                height: aboutSize,
                borderRadius: aboutSize / 2,
              },
            ]}
          >
            {/* ✅ Profile OR full-bleed SVG */}
            {profilePhotoUri ? (
              <Image
                source={{ uri: profilePhotoUri }}
                style={styles.aboutFillImg}
              />
            ) : (
              <AboutIcon
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid slice"
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Header text */}
      <View style={{ paddingHorizontal: gutter }}>
        <View style={{ paddingTop: headerGap }}>
          <Text
            style={[styles.coupleNames, { fontSize: titleSize, color: Colors.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {bride} & {groom}
          </Text>

          <Text
            style={[
              styles.weddingDate,
              { marginTop: textGap, fontSize: dateSize,   color: "#2D2A2B",
                fontWeight:300 },
            ]}
          >
            {date}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: Colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },

  topRight: {
    position: 'absolute',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  aboutCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // ✅ REQUIRED for circle crop
  },

  aboutFillImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  coupleNames: { fontWeight: '800' },
  weddingDate: { fontWeight: '500' },

  divider: {
    height: 1,
    marginTop: 18,
  },
});