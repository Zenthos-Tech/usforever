import Colors from '@/theme/colors';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  PixelRatio,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton, { PRIMARY_RADIUS_16 } from '@/components/PrimaryButton';
import { useLayoutTokens } from '@/ui/layout';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

/** ✅ Your assets */
const c1 = require('../assets/images/image1.png');
const c2 = require('../assets/images/image4.png');
const c3 = require('../assets/images/image6.png');
const c4 = require('../assets/images/image2.png');
const c5 = require('../assets/images/image7.png');
const c6 = require('../assets/images/image3.png');
const c7 = require('../assets/images/image5.png');
const c8 = require('../assets/images/image8.png');

const big1 = require('../assets/images/image9.png');
const big2 = require('../assets/images/image10.png');

const SLIDES = [
  { id: 'collage', type: 'mosaic', photos: [c1, c2, c3, c4, c5, c6, c7, c8] },
  { id: 'big1', type: 'big', photo: big1 },
  { id: 'big2', type: 'big', photo: big2 },
];

const TILE_KEYS = ['LT', 'C_BIG', 'RT', 'LM', 'RM', 'LB', 'CB', 'RB'];

export default function OnboardingScreen() {
const router = useRouter();
const t = useLayoutTokens();
const { width: screenW } = useWindowDimensions();

const insets = useSafeAreaInsets();          // ✅ ADD HERE
const bottomExtra = clamp(t.H * 0.02, 8, 16);

  const listRef = useRef(null);

  // Loop data: [lastClone, ...real, firstClone]
  const loopData = useMemo(() => {
    const first = SLIDES[0];
    const last = SLIDES[SLIDES.length - 1];
    return [
      { ...last, __clone: 'last', id: `${last.id}__clone_last` },
      ...SLIDES,
      { ...first, __clone: 'first', id: `${first.id}__clone_first` },
    ];
  }, []);

  // Start on first REAL slide (index 1 in loopData)
  const [rawIndex, setRawIndex] = useState(1);
  const logicalIndex = useMemo(() => {
    const n = SLIDES.length;
    return (rawIndex - 1 + n) % n;
  }, [rawIndex]);

  const handleGetStarted = () => router.push('/signin');
  const handleSkip = () => router.replace('/signin');

  // ---------- Responsive sizes ----------
  const logoW = clamp(t.W * 0.36, t.W * 0.3, t.W * 0.42);
  const logoH = clamp(t.W * 0.08, t.W * 0.06, t.W * 0.09);

  const dotSize = clamp(t.W * 0.018, t.W * 0.014, t.W * 0.02);
  const dotGap = clamp(t.W * 0.016, t.W * 0.012, t.W * 0.02);
  const activeDotW = clamp(t.W * 0.06, t.W * 0.05, t.W * 0.075);

  // ✅ Figma Title: 34px, line-height 100%, letterSpacing 0
  const titleSize = useMemo(() => clamp(t.W * 0.09, 27, 29), [t.W]); // max 34 like Figma
  const titleLine = useMemo(() => Math.round(titleSize * 1.0), [titleSize]); // ✅ 100%

  // ✅ Description: Figma-like body proportions (adjust if you share exact figma values)
  const descSize = useMemo(() => clamp(t.W * 0.04, 12, 14), [t.W]);
  const descLine = useMemo(() => Math.round(descSize * 1.45), [descSize]);

  // ✅ Use PrimaryButton radius token for carousel too (16px)
  const radius = PRIMARY_RADIUS_16;

  const logoToCarouselGap = useMemo(() => clamp(t.H * 0.02, 14, 40), [t.H]);

  // ✅ IMPORTANT: integer width reduces Android seams
  const carouselW = useMemo(
    () => Math.round(Math.max(0, screenW - t.gutter * 2)),
    [screenW, t.gutter]
  );

  // ✅ Bigger/taller frame like screenshot
  const carouselH = useMemo(() => clamp(t.H * 0.48, 320, 460), [t.H]);

  // ✅ bleed (a bit stronger on Android)
  const inset = useMemo(() => {
    const px = 1 / PixelRatio.get();
    return Platform.OS === 'android' ? px * 2 : px;
  }, []);

  const onScrollToIndexFailed = useRef(() => {}).current;

  // Auto-advance
  useEffect(() => {
    const intervalMs = Math.round(t.ms4 || 3000);
    const timer = setInterval(() => {
      const nextRaw = rawIndex + 1;
      listRef.current?.scrollToOffset({ offset: carouselW * nextRaw, animated: true });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [rawIndex, carouselW, t.ms4]);

  // Wrap handling with no “flash”
  const onMomentumScrollEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const nextRaw = Math.round(x / carouselW);
    const n = SLIDES.length;

    if (nextRaw === 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: carouselW * n, animated: false });
        setRawIndex(n);
      });
      return;
    }

    if (nextRaw === n + 1) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: carouselW * 1, animated: false });
        setRawIndex(1);
      });
      return;
    }

    setRawIndex(nextRaw);
  };

  const renderItem = ({ item }) => {
    if (item.type === 'mosaic') {
      const frame = { w: carouselW, h: carouselH };

      return (
        <View style={[styles.slide, { width: carouselW, backgroundColor: Colors.background }]}>
          <View
            style={[
              styles.card,
              {
                width: carouselW,
                height: carouselH,
                borderRadius: radius,
                backgroundColor: Colors.background,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              style={[
                styles.mosaicFrame,
                {
                  borderRadius: radius,
                  backgroundColor: Colors.background,
                  position: 'absolute',
                  top: -inset,
                  left: -inset,
                  right: -inset,
                  bottom: -inset,
                },
              ]}
            >
              {item.photos.map((src, idx) => {
                const key = TILE_KEYS[idx];
                const isGirl = key === 'RM';
                const tilePos = tileStyle(frame, key);

                const girlTransform = null;
                 
                return (
                  <View
                    key={`${item.id}-${idx}`}
                    style={[styles.tileWrap, tilePos, { backgroundColor: Colors.background }]}
                    renderToHardwareTextureAndroid
                    shouldRasterizeIOS
                  >
                    <Image
  source={src}
  resizeMode="cover"
  fadeDuration={0}
  style={[
    styles.tileImg,
    girlTransform ? { transform: girlTransform } : null,
  ]}
/>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      );
    }

    // ✅ BIG SLIDES
    return (
      <View style={[styles.slide, { width: carouselW, backgroundColor: Colors.background }]}>
        <View
          style={[
            styles.card,
            {
              width: carouselW,
              height: carouselH,
              borderRadius: radius,
              backgroundColor: Colors.background,
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: -inset,
              left: -inset,
              right: -inset,
              bottom: -inset,
              backgroundColor: Colors.background,
            }}
          >
            <Image
              source={item.photo}
              resizeMode="cover"
              fadeDuration={0}
              style={{ width: '100%', height: '100%', backgroundColor: Colors.background }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
<SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.outer, { paddingHorizontal: t.gutter }]}>
        <View style={styles.inner}>
          <View style={styles.fullHeight}>
            <View style={{ flex: 1 }}>
              {/* HEADER */}
              <View style={{ marginTop: t.v1 }}>
                <View style={styles.logoRow}>
                  <Image
                    source={require('../assets/images/logo-title.png')}
                    style={{ width: logoW, height: logoH, resizeMode: 'contain' }}
                  />
                </View>
              </View>

              <View style={{ height: logoToCarouselGap }} />

              {/* CAROUSEL */}
              <View style={{ alignItems: 'center' }}>
                <FlatList
                  ref={listRef}
                  data={loopData}
                  keyExtractor={(it) => it.id}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  onMomentumScrollEnd={onMomentumScrollEnd}
                  renderItem={renderItem}
                  initialScrollIndex={1}
                  showsVerticalScrollIndicator={false}
                  overScrollMode="never"
                  onScrollToIndexFailed={onScrollToIndexFailed}
                  getItemLayout={(_, index) => ({
                    length: carouselW,
                    offset: carouselW * index,
                    index,
                  })}
                  snapToInterval={carouselW}
                  disableIntervalMomentum
                  style={{ backgroundColor: Colors.background }}
                  contentContainerStyle={{ backgroundColor: Colors.background }}
                  windowSize={5}
                  initialNumToRender={5}
                  maxToRenderPerBatch={5}
                  updateCellsBatchingPeriod={50}
                  removeClippedSubviews={false}
                  scrollEventThrottle={16}
                />
              </View>

              {/* DOTS */}
              <View style={[styles.dotContainer, { marginTop: t.v2 }]}>
                {SLIDES.map((_, index) => {
                  const isActive = logicalIndex === index;
                  return (
                    <View
                      key={index}
                      style={{
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        marginHorizontal: dotGap / 2,
                        backgroundColor: isActive ? Colors.primaryPink : Colors.border,
                        width: isActive ? activeDotW : dotSize,
                        opacity: isActive ? 1 : 0.95,
                      }}
                    />
                  );
                })}
              </View>
            </View>
{/* BOTTOM */}
<View style={{ paddingBottom: clamp(t.H * 1.8, 20, 40) }}>
<View
  style={[
    styles.footerText,
    {
      marginTop: 0,
      transform: [{ translateY: -clamp(t.H * 0.02, 10, 30) }], // ✅ only text up
    },
  ]}
>
  
                <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLine }]}>
                  Your love deserves a{'\n'}safe place to live
                </Text>

                <Text style={[styles.description, { fontSize: descSize, lineHeight: descLine, marginTop: t.v1 }]}>
                  Relive your wedding, feel it again, and share it,{'\n'}with the people who matter.
                </Text>
              </View>

              <View style={{ marginTop: t.v3 }}>
                <PrimaryButton title="GET STARTED" onPress={handleGetStarted} radius={PRIMARY_RADIUS_16} />
                <TouchableOpacity onPress={handleSkip} style={{ paddingVertical: t.v1, alignItems: 'center' }}>
                  <Text style={[styles.skipText, { fontSize: descSize }]}>SKIP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * ✅ Equal columns (girl tile SAME size as center big tiles)
 * ✅ No remainder widths (removes seam)
 */
function tileStyle(frame, key) {
  const W = Math.round(frame.w);
  const H = Math.round(frame.h);

  const gap = Math.round(W * 0.04);

  const colW = Math.floor((W - gap * 2) / 3);
  const padX = Math.floor((W - (colW * 3 + gap * 2)) / 2);

  const padY = Math.round(gap * 0.28);

  const xL = padX;
  const xC = padX + colW + gap;
  const xR = padX + colW + gap + colW + gap;

  const bigH1 = Math.floor((H - padY * 2 - gap) / 2);
  const bigH2 = H - padY * 2 - gap - bigH1;

  const midH = bigH1;

  const remainForSmalls = H - padY * 2 - gap * 2 - midH;
  const smallH1 = Math.floor(remainForSmalls / 2);
  const smallH2 = remainForSmalls - smallH1;

  const yT = padY;
  const yM = padY + smallH1 + gap;
  const yB = padY + smallH1 + gap + midH + gap;

  const yCT = padY;
  const yCB = padY + bigH1 + gap;

  const r = Math.round(W * 0.045);

  const map = {
    LT: { left: xL, top: yT, width: colW, height: smallH1, borderRadius: r },
    LM: { left: xL, top: yM, width: colW, height: midH, borderRadius: r },
    LB: { left: xL, top: yB, width: colW, height: smallH2, borderRadius: r },

    C_BIG: { left: xC, top: yCT, width: colW, height: bigH1, borderRadius: r },
    CB: { left: xC, top: yCB, width: colW, height: bigH2, borderRadius: r },

    RT: { left: xR, top: yT, width: colW, height: smallH1, borderRadius: r },
    RM: { left: xR, top: yM, width: colW, height: midH, borderRadius: r },
    RB: { left: xR, top: yB, width: colW, height: smallH2, borderRadius: r },
  };

  return { position: 'absolute', ...map[key] };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  outer: { flex: 1, alignItems: 'center' },
  inner: { width: '100%', flex: 1 },
  fullHeight: { flex: 1 },

  logoRow: { flexDirection: 'row', justifyContent: 'center' },

  slide: { alignItems: 'center', justifyContent: 'center' },

  card: { overflow: 'hidden', borderWidth: 0, borderColor: 'transparent' },

  mosaicFrame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },

  tileWrap: { overflow: 'hidden', borderWidth: 0, borderColor: 'transparent' },
  tileImg: { width: '100%', height: '100%' },

  dotContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  footerText: { width: '100%', alignItems: 'center' },

  // ✅ Figma: Grift / 700 / line-height 100% / letterSpacing 0 / centered
  title: {
    fontFamily: 'Grift',
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
    color: Colors.textPrimary,
  },

  // ✅ Description: centered + clean
  description: {
    textAlign: 'center',
    color: Colors.textSecondary,
    letterSpacing: 0,
    fontWeight: '400',
  },

  skipText: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    letterSpacing: 1,
    fontWeight: '600',
  },
}); 