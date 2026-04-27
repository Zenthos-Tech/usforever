import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

import Logo1 from '../assets/images/animation1.svg';
import Logo2 from '../assets/images/animation2.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function IntroAnimation() {
  const router = useRouter();
  const t = useLayoutTokens();

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const [showSecondLogo, setShowSecondLogo] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);

  const box = useMemo(() => clamp(t.short * 0.38, t.short * 0.32, t.short * 0.44), [t.short]);
  const logo = useMemo(() => box * 0.88, [box]);

  const shimmerLen = useMemo(() => box * 1.45, [box]);
  const shimmerThick = useMemo(() => clamp(box * 0.09, box * 0.06, box * 0.11), [box]);
  const shimmerStart = useMemo(() => shimmerLen * 0.5, [shimmerLen]);
  const shimmerEnd = useMemo(() => -shimmerLen * 0.5, [shimmerLen]);

  const shimmerDelay = useMemo(() => Math.round(clamp(t.ms4 || 420, 320, 520)), [t.ms4]);
  const shimmerDuration = useMemo(() => Math.round(clamp(t.ms5 || 520, 520, 900)), [t.ms5]);
  const navDelay = useMemo(
    () => shimmerDelay + shimmerDuration + Math.round(clamp(t.ms4 || 420, 700, 1200)),
    [shimmerDelay, shimmerDuration, t.ms4]
  );

  useEffect(() => {
    const shimmerTimer = setTimeout(() => {
      setShowShimmer(true);
      shimmerAnim.setValue(shimmerStart);

      Animated.timing(shimmerAnim, {
        toValue: shimmerEnd,
        duration: shimmerDuration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setShowShimmer(false);
        setShowSecondLogo(true);
      });
    }, shimmerDelay);

    const navTimer = setTimeout(() => {
      router.replace('/subscription');
    }, navDelay);

    return () => {
      clearTimeout(shimmerTimer);
      clearTimeout(navTimer);
    };
  }, [router, shimmerAnim, shimmerStart, shimmerEnd, shimmerDelay, shimmerDuration, navDelay]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View
        style={[
          styles.logoWrap,
          {
            width: box,
            height: box,
            backgroundColor: Colors.background,
            borderRadius: clamp(t.short * 0.035, t.short * 0.028, t.short * 0.05),
          },
        ]}
      >
        {showSecondLogo ? (
          <Logo2 width={logo} height={logo} />
        ) : (
          <Logo1 width={logo} height={logo} />
        )}

        {showShimmer && (
          <Animated.View
            style={[
              styles.diagonalShimmer,
              {
                width: shimmerLen,
                height: shimmerThick,
                backgroundColor: Colors.white,
                opacity: 0.85,
                transform: [
                  { translateX: shimmerAnim },
                  { translateY: Animated.multiply(shimmerAnim, -1) },
                  { rotate: '45deg' },
                ],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoWrap: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  diagonalShimmer: {
    position: 'absolute',
  },
});