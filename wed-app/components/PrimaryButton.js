// components/PrimaryButton.js
// ✅ 2-state colors: disabled grey, enabled pink
// ✅ On press: DARK PINK fill spreads as a CIRCLE from TOP-CENTER
// ✅ No flicker (solid overlay; minimal blending)
// ✅ Responsive sizing + safe fallbacks
// ✅ NEW: forceDark -> solid DARK PINK (prevents grey during loading/navigation)

import Colors from "@/theme/colors";
import { useLayoutTokens } from "@/ui/layout";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Measures actual rendered width so the circle reveal is always correctly
// positioned, even when the button is inside a narrower card (e.g. password modal).

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
export const PRIMARY_RADIUS_16 = 16;

const DARKER_PINK = "#A5485A";

export default function PrimaryButton({
  title,
  onPress,
  enabled = true,
  height,
  radius = PRIMARY_RADIUS_16,
  style,
  textStyle,
  forceDark = false,
}) {
  const t0 = useLayoutTokens() || {};
  const W = Number.isFinite(t0.W) ? t0.W : 390;
  const H = Number.isFinite(t0.H) ? t0.H : 844;
  const gutter = Number.isFinite(t0.gutter) ? t0.gutter : 20;

  const [animating, setAnimating] = useState(false);
  // Actual rendered width — measured via onLayout so the circle is centred
  // correctly even when the button is narrower than the screen (e.g. inside a card).
  const [actualW, setActualW] = useState(0);

  const resetTimer = useRef(null);
  useEffect(() => {
    return () => resetTimer.current && clearTimeout(resetTimer.current);
  }, []);

  const touchDisabled = !enabled || animating || forceDark;

  const btnW = useMemo(
    () => Math.round(Math.max(0, W - gutter * 2)),
    [W, gutter],
  );
  const btnH = useMemo(
    () => Math.round(height ?? clamp(H * 0.06, 44, 56)),
    [height, H],
  );

  // Use measured width when available; fall back to screen-derived btnW.
  const circleBaseW = actualW > 0 ? actualW : btnW;

  // ✅ Circle reveal: radius must cover from top-center to the farthest corner (bottom-left or bottom-right)
  const maxCircleRadius = useMemo(
    () => Math.ceil(Math.sqrt((circleBaseW / 2) ** 2 + btnH ** 2)),
    [circleBaseW, btnH],
  );

  // Circle diameter = maxCircleRadius * 2
  const circleDiameter = maxCircleRadius * 2;

  // Animated scale for the circle (0 → 1 covers entire button)
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;

  const resetCircle = () => {
    circleScale.setValue(0);
    circleOpacity.setValue(0);
  };

  const hardResetVisual = () => {
    resetCircle();
    setAnimating(false);
  };

  useEffect(() => {
    if (!enabled || forceDark) hardResetVisual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, forceDark]);

  const baseBg = forceDark
    ? DARKER_PINK
    : !enabled
      ? Colors.disabledGrey
      : Colors.primaryPink;

  const runFillAndPress = () => {
    if (!onPress) return;

    setAnimating(true);
    resetCircle();

    // Fade in quickly, then scale the circle out from top-center
    Animated.parallel([
      Animated.timing(circleOpacity, {
        toValue: 1,
        duration: 30,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;

      // Slight overshoot for tactile feel
      Animated.timing(circleScale, {
        toValue: 1.05,
        duration: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished: f2 }) => {
        if (!f2) return;

        resetTimer.current && clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => {
          Animated.timing(circleOpacity, {
            toValue: 0,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            setAnimating(false);
            resetCircle();
          });
        }, 80);

        onPress?.();
      });
    });
  };

  return (
    <Pressable
      onPress={touchDisabled ? undefined : runFillAndPress}
      style={({ pressed }) => [
        styles.wrap,
        {
          width: btnW,
          height: btnH,
          borderRadius: radius,
          opacity: !enabled ? 0.92 : pressed ? 0.98 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      <View
        onLayout={(e) => setActualW(Math.round(e.nativeEvent.layout.width))}
        style={[
          styles.inner,
          { borderRadius: radius, backgroundColor: baseBg },
        ]}
      >
        {/* ✅ Circle overlay expanding from TOP-CENTER */}
        {animating && !forceDark && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.circle,
              {
                width: circleDiameter,
                height: circleDiameter,
                borderRadius: maxCircleRadius,
                backgroundColor: DARKER_PINK,
                // Position: centered horizontally, top edge at button top
                left: (circleBaseW - circleDiameter) / 2,
                top: -maxCircleRadius, // circle center sits at the top edge of the button
                opacity: circleOpacity,
                transform: [{ scale: circleScale }],
              },
            ]}
          />
        )}

        <Text
          style={[
            styles.txt,
            { color: "#fff", fontSize: clamp(W * 0.032, 12, 14) },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center" },
  inner: {
    flex: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
  },
  txt: { fontWeight: "700", letterSpacing: 0.6 },
});
