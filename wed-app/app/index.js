// app/SplashScreen.js
import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/theme/colors';
import { useLayoutTokens as useLayoutTokensImported } from '../ui/layout';

import GroupLogo from '../assets/images/Group.svg';
import LogoTitle from '../assets/images/logo-title.svg';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const AnimatedGroupLogo = Animated.createAnimatedComponent(GroupLogo);
const AnimatedLogoTitle = Animated.createAnimatedComponent(LogoTitle);

export default function SplashScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();

  const { width: W, height: H } = useWindowDimensions();
  const fallbackShort = Math.min(W, H);

  const t =
    typeof useLayoutTokensImported === 'function'
      ? useLayoutTokensImported()
      : { short: fallbackShort };

  const short = Number(t?.short || fallbackShort);

  const logoSize = useMemo(() => {
    const size = short * 0.16;
    return clamp(size, 45, 75);
  }, [short]);

  const titleW = useMemo(() => clamp(logoSize * 1.5, 120, 180), [logoSize]);
  const titleH = useMemo(() => clamp(logoSize * 0.3, 20, 38), [logoSize]);

  /**
   * Wrapper stays fixed at center.
   * SVG moves inside wrapper with overflow hidden.
   */
  const logoImgY = useRef(new Animated.Value(-logoSize)).current;
  const titleImgY = useRef(new Animated.Value(titleH)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const logoScale = useRef(new Animated.Value(0.985)).current;
  const titleScale = useRef(new Animated.Value(0.99)).current;

  useEffect(() => {
    logoImgY.setValue(-logoSize);
    titleImgY.setValue(titleH);
    logoOpacity.setValue(0);
    titleOpacity.setValue(0);
    logoScale.setValue(0.985);
    titleScale.setValue(0.99);

    const easeOut = Easing.out(Easing.cubic);

    const logoMove = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoImgY, {
          toValue: logoSize * 0.1,
          duration: 320,
          easing: easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 320,
          easing: easeOut,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(logoImgY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const titleMove = Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(titleImgY, {
          toValue: -(titleH * 0.18),
          duration: 360,
          easing: easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 360,
          easing: easeOut,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleImgY, {
        toValue: 0,
        duration: 190,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([logoMove, titleMove]).start();
  }, [
    logoSize,
    titleH,
    logoImgY,
    titleImgY,
    logoOpacity,
    titleOpacity,
    logoScale,
    titleScale,
  ]);

  const skipRedirect = useRef(false);

  // Catch warm-start deep links (app already running when link is tapped)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url && (url.includes('//share/') || url.includes('/share/'))) {
        skipRedirect.current = true;
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;
    if (skipRedirect.current) return;

    let cancelled = false;

    async function maybeRedirect() {
      // 1. Pathname already on share/password route
      if (
        pathname?.startsWith('/share/') ||
        pathname === '/passwordscreen' ||
        (pathname && pathname !== '/')
      ) {
        skipRedirect.current = true;
        return;
      }

      // 2. Check cold-start launch URL
      const url = await Linking.getInitialURL();
      if (cancelled) return;

      if (url && (url.includes('//share/') || url.includes('/share/'))) {
        skipRedirect.current = true;
        // Extract slug and token and navigate explicitly — Expo Router may not
        // auto-route when initialRouteName forces index as the stack root.
        const slugMatch = url.match(/\/share\/([^?&#/]+)/);
        const tMatch = url.match(/[?&]t=([^&#]+)/);
        const deepSlug = slugMatch ? slugMatch[1] : null;
        const deepToken = tMatch ? decodeURIComponent(tMatch[1]) : null;
        if (deepSlug && deepToken && !cancelled) {
          router.replace({
            pathname: '/share/[slug]',
            params: { slug: deepSlug, t: deepToken },
          });
        }
        return;
      }

      if (skipRedirect.current || cancelled) return;

      // 3. Normal launch — wait for splash then go to onboarding
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (cancelled || skipRedirect.current) return;

      router.replace('/onboarding');
    }

    maybeRedirect();

    return () => {
      cancelled = true;
    };
  }, [navigationState?.key, router, pathname]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: Colors?.background ?? '#fff' }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.center}>
        <View style={styles.stack}>
          <Animated.View
            style={[
              styles.logoClip,
              {
                width: logoSize,
                height: logoSize,
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <AnimatedGroupLogo
              width={logoSize}
              height={logoSize}
              style={{
                transform: [{ translateY: logoImgY }],
              }}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.titleClip,
              {
                width: titleW,
                height: titleH,
                opacity: titleOpacity,
                transform: [{ scale: titleScale }],
              },
            ]}
          >
            <AnimatedLogoTitle
              width={titleW}
              height={titleH}
              style={{
                transform: [{ translateY: titleImgY }],
              }}
            />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stack: { alignItems: 'center', justifyContent: 'center' },

  logoClip: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  titleClip: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});