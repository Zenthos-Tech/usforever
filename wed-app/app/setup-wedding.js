// app/setup-wedding.js

import PinkCalendarModal from "@/components/Calendar";
import ErrorModal from "@/components/ErrorModal";
import PrimaryButton from "@/components/PrimaryButton";
import Colors from "@/theme/colors";
import { useLayoutTokens } from "@/ui/layout";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Calendar from "../assets/images/calendar.svg";
import Heart from "../assets/images/heart.svg";
import Knot from "../assets/images/knot.svg";
import { useWedding } from "../context/WeddingContext";
import { API_URL } from "../utils/api";

const HERO_IMG = require("../assets/images/love-story.jpeg");


const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const extractWeddingId = (json) =>
  json?.weddingId ||
  json?.data?.id ||
  json?.data?.weddingId ||
  json?.id ||
  json?._id ||
  "";

const extractWeddingSlug = (json) =>
  json?.weddingSlug ||
  json?.data?.weddingSlug ||
  null;

const joinUrl = (base, path) => {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
};

export default function SetupWedding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useLayoutTokens();

  const {
    weddingData,
    setWeddingId,
    setBrideName: setBrideNameGlobal,
    setGroomName: setGroomNameGlobal,
    setWeddingDate: setWeddingDateGlobal,
    setWeddingSlug,
  } = useWedding();

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);

  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [formHMeasured, setFormHMeasured] = useState(0);

  const [brideFocused, setBrideFocused] = useState(false);
  const [groomFocused, setGroomFocused] = useState(false);

  const brideTextRef = useRef(null);
  const groomTextRef = useRef(null);

  // ✅ Error modal state (replaces Alert)
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (msg) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const isFormValid = !!(
    String(brideName).trim() &&
    String(groomName).trim() &&
    String(weddingDate).trim()
  );
  const isKb = keyboardOverlap > 0;

  const headerH = useMemo(() => {
    return insets.top + t.v2 + clamp(t.W * 0.085, t.W * 0.1, t.W * 0.13);
  }, [insets.top, t.v2, t.W]);

  const gutter = t.gutter;

  const cardRadius = useMemo(
    () => clamp(t.short * 0.04, t.short * 0.03, t.short * 0.05),
    [t.short],
  );

  const overlayOpacity = useMemo(() => clamp(0.38, 0.32, 0.42), []);
  const heroTextOpacity = useMemo(() => clamp(0.86, 0.82, 0.9), []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e) => {
      const end = e?.endCoordinates;
      if (!end) return setKeyboardOverlap(0);
      const keyboardTopY = end.screenY ?? t.H - (end.height || 0);
      setKeyboardOverlap(Math.max(0, t.H - keyboardTopY));
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardOverlap(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [t.H]);

  const btnH = useMemo(
    () => clamp(t.H * 0.063, t.H * 0.055, t.H * 0.072),
    [t.H],
  );

  const contentBottomPad = useMemo(() => {
    const breathe = isKb ? t.v1 * 0.25 : t.v2 * 1.0;
    const safe = isKb ? 0 : insets.bottom;
    return btnH + breathe + safe;
  }, [btnH, isKb, t.v1, t.v2, insets.bottom]);

  const heartSize = useMemo(
    () => clamp(t.W * 0.04, t.W * 0.032, t.W * 0.045),
    [t.W],
  );

  const usableH = useMemo(() => {
    const h = t.H - headerH - keyboardOverlap - contentBottomPad;
    return Math.max(0, h);
  }, [t.H, headerH, keyboardOverlap, contentBottomPad]);

  const targets = useMemo(() => {
    const inputH = clamp(t.H * 0.06, t.H * 0.05, t.H * 0.08);

    const extraLift = isKb ? t.v1 * 1.2 : 0;
    const btnBottomPad = isKb ? 0 : clamp(t.H * 0.02, t.H * 0.015, t.H * 0.03);
    const buttonBottom =
      keyboardOverlap + extraLift + (isKb ? 0 : insets.bottom) + btnBottomPad;

    const baseHeroToForm = isKb ? t.v1 * 0.6 : t.v1 * 0.64;
    const baseInsideForm = isKb ? t.v1 * 0.06 : t.v1 * 0.12;
    const baseDateGap = isKb ? t.v1 * 0.06 : t.v1 * 0.1;

    const ratioTarget = isKb ? 0.32 : 0.62;
    const heroByRatio = usableH * ratioTarget;

    const heroIdeal =
      usableH -
      (formHMeasured || 0) -
      baseHeroToForm -
      baseInsideForm -
      baseDateGap;

    const heroMaxClosed = t.H * 0.82;
    const heroMinClosed = t.H * 0.36;
    const heroMaxKb = t.H * 0.4;
    const heroMinKb = t.H * 0.18;

    const heroRaw = Math.min(heroByRatio, heroIdeal);
    const heroBase = isKb
      ? clamp(heroRaw, heroMinKb, heroMaxKb)
      : clamp(heroRaw, heroMinClosed, heroMaxClosed);

    const used =
      heroBase +
      (formHMeasured || 0) +
      baseHeroToForm +
      baseInsideForm +
      baseDateGap;
    const extra = Math.max(0, usableH - used);

    const addHero = extra * (isKb ? 0.75 : 0.55);
    const addHeroToForm = extra * (isKb ? 0.02 : 0.06);
    const addInside = extra * (isKb ? 0.02 : 0.05);
    const addDate = extra * (isKb ? 0.01 : 0.04);

    return {
      inputH,
      hero: heroBase + addHero,
      gapHeroToForm: baseHeroToForm + addHeroToForm,
      gapInsideForm: baseInsideForm + addInside,
      dateGap: baseDateGap + addDate,
      buttonBottom,
    };
  }, [
    isKb,
    t.H,
    t.v1,
    t.v2,
    insets.bottom,
    keyboardOverlap,
    usableH,
    formHMeasured,
  ]);

  const heroH = useRef(new Animated.Value(targets.hero)).current;
  const inputHAnim = useRef(new Animated.Value(targets.inputH)).current;
  const gapHeroToFormAnim = useRef(
    new Animated.Value(targets.gapHeroToForm),
  ).current;
  const gapInsideFormAnim = useRef(
    new Animated.Value(targets.gapInsideForm),
  ).current;
  const dateGapAnim = useRef(new Animated.Value(targets.dateGap)).current;
  const buttonBottomAnim = useRef(
    new Animated.Value(targets.buttonBottom),
  ).current;

  const brideAnim = useRef(new Animated.Value(0)).current;
  const groomAnim = useRef(new Animated.Value(0)).current;

  const didMount = useRef(false);

  const animateLabel = (anim, to) => {
    Animated.spring(anim, {
      toValue: to,
      speed: 14,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (!didMount.current) {
      heroH.setValue(targets.hero);
      inputHAnim.setValue(targets.inputH);
      gapHeroToFormAnim.setValue(targets.gapHeroToForm);
      gapInsideFormAnim.setValue(targets.gapInsideForm);
      dateGapAnim.setValue(targets.dateGap);
      buttonBottomAnim.setValue(targets.buttonBottom);
      didMount.current = true;
      return;
    }

    const spring = (val, to) =>
      Animated.spring(val, {
        toValue: to,
        speed: 20,
        bounciness: 0,
        useNativeDriver: false,
      });

    const smooth = (val, to, ms) =>
      Animated.timing(val, {
        toValue: to,
        duration: Math.round(ms),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });

    Animated.parallel([
      spring(heroH, targets.hero),
      spring(inputHAnim, targets.inputH),
      spring(gapHeroToFormAnim, targets.gapHeroToForm),
      spring(gapInsideFormAnim, targets.gapInsideForm),
      spring(dateGapAnim, targets.dateGap),
      smooth(buttonBottomAnim, targets.buttonBottom, t.ms2 || 260),
    ]).start();
  }, [
    targets.hero,
    targets.inputH,
    targets.gapHeroToForm,
    targets.gapInsideForm,
    targets.dateGap,
    targets.buttonBottom,
    heroH,
    inputHAnim,
    gapHeroToFormAnim,
    gapInsideFormAnim,
    dateGapAnim,
    buttonBottomAnim,
    t.ms2,
  ]);

  const openDatePicker = () => {
    Keyboard.dismiss();
    setShowCalendar(true);
  };

  const forceCursorStart = (ref) => {
    requestAnimationFrame(() => {
      ref?.current?.setNativeProps?.({ selection: { start: 0, end: 0 } });
    });
  };

  const brideAlign = "left";
  const groomAlign = "left";

  const onGetStarted = async () => {
    const phone = String(weddingData?.phone || "").trim();
    if (!phone) {
      showError("Phone not found. Please re-login.");
      router.replace("/signin");
      return;
    }

    setLoading(true);
    try {
      const payload = { brideName, groomName, weddingDate, phone };
      const url = joinUrl(API_URL, "create-wedding");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        const msg =
          json?.error?.message ||
          json?.message ||
          `Create wedding failed (HTTP ${res.status})`;
        throw new Error(msg);
      }

      const newId = extractWeddingId(json);
      if (!newId) throw new Error("Wedding created but id missing in response");

      const slug = extractWeddingSlug(json);

      setWeddingId?.(String(newId).trim());
      setBrideNameGlobal?.(brideName);
      setGroomNameGlobal?.(groomName);
      setWeddingDateGlobal?.(weddingDate);

      if (slug) setWeddingSlug?.(String(slug));

      router.replace("/animation");
    } catch (e) {
      showError(e?.message || "Failed to create wedding");
    } finally {
      setLoading(false);
    }
  };

  const logoSize = useMemo(
    () => clamp(t.W * 0.06, t.W * 0.05, t.W * 0.07),
    [t.W],
  );
  const heroTitleSize = useMemo(
    () => clamp(t.W * 0.06, t.W * 0.05, t.W * 0.068),
    [t.W],
  );
  const heroSubSize = useMemo(
    () => clamp(t.W * 0.034, t.W * 0.03, t.W * 0.04),
    [t.W],
  );
  const fieldFont = useMemo(
    () => clamp(t.W * 0.04, t.W * 0.036, t.W * 0.045),
    [t.W],
  );
  const labelFont = useMemo(
    () => clamp(t.W * 0.032, t.W * 0.028, t.W * 0.036),
    [t.W],
  );

  const inputRadius = useMemo(
    () => clamp(t.short * 0.03, t.short * 0.025, t.short * 0.035),
    [t.short],
  );

  // ✅ Label sits exactly on the top border when focused
  const labelPadH = useMemo(
    () => clamp(t.W * 0.012, t.W * 0.01, t.W * 0.018),
    [t.W],
  );
  const inputPadTop = useMemo(
    () => clamp(t.H * 0.018, t.H * 0.016, t.H * 0.022),
    [t.H],
  );

  // ✅ Float label: unfocused center = inputH/2, focused = sitting on top border (y=0)
  // We position label with top:0 and use translateY to move it
  const labelUnfocusedY = useMemo(
    () => targets.inputH * 0.32,
    [targets.inputH],
  );
  const labelFocusedY = useMemo(() => -(labelFont * 0.55), [labelFont]);

  const knotW = useMemo(() => clamp(t.W * 0.1, t.W * 0.085, t.W * 0.14), [t.W]);
  const knotH = useMemo(
    () => clamp(knotW * 0.85, knotW * 0.8, knotW * 0.95),
    [knotW],
  );

  const knotEnabled = !!(String(brideName).trim() && String(groomName).trim());
  const KNOT_DISABLED = "#000000";

  const rowUsableW = useMemo(
    () => Math.min(t.W - gutter * 2, t.contentMaxW),
    [t.W, gutter, t.contentMaxW],
  );

  const knotBoxW = useMemo(
    () => Math.round(clamp(knotW * 0.48, 26, 38)),
    [knotW],
  );

  const inputW = useMemo(() => {
    const w = (rowUsableW - knotBoxW) / 2;
    const minW = Math.round(rowUsableW * 0.4);
    const maxW = Math.round(rowUsableW * 0.58);
    return Math.round(clamp(w, minW, maxW));
  }, [rowUsableW, knotBoxW]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* ✅ Error Modal */}
      <ErrorModal
        visible={errorVisible}
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />

      <View
        pointerEvents="none"
        style={[
          styles.header,
          {
            height: headerH,
            paddingTop: insets.top,
            backgroundColor: Colors.background,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <Text
            style={[
              styles.logo,
              { fontSize: logoSize, color: Colors.textPrimary },
            ]}
          >
            us forever
          </Text>
          <Heart
            width={heartSize}
            height={heartSize}
            fill={Colors.primaryPink}
            style={{
              marginLeft: -logoSize * 0.04,
              marginTop: -logoSize * 0.8,
            }}
          />
        </View>
      </View>

      <View
        style={{
          flex: 1,
          paddingTop: headerH,
          paddingBottom: contentBottomPad,
        }}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />

        <Animated.View
          style={[
            styles.heroWrap,
            {
              marginTop: isKb ? t.v1 * 0.25 : t.v1 * 0.45,
              height: heroH,
              marginHorizontal: gutter,
              borderRadius: cardRadius,
            },
          ]}
        >
          <ImageBackground
            source={HERO_IMG}
            style={styles.heroBg}
            imageStyle={{ borderRadius: cardRadius }}
            resizeMode="cover"
          >
            <View
              style={[
                styles.heroOverlay,
                { backgroundColor: Colors.black, opacity: overlayOpacity },
              ]}
            />
            <View style={[styles.heroTextWrap, { padding: t.v2 }]}>
              <Text
                style={[
                  styles.heroTitle,
                  { fontSize: heroTitleSize, color: Colors.white },
                ]}
              >
                Every love story{"\n"}starts with names
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  {
                    fontSize: heroSubSize,
                    marginTop: t.v1 * 0.35,
                    color: Colors.white,
                    opacity: heroTextOpacity,
                  },
                ]}
              >
                Tell us who this love story belongs to.
              </Text>
            </View>
          </ImageBackground>
        </Animated.View>

        <Animated.View
          style={{ marginTop: gapHeroToFormAnim, paddingHorizontal: gutter }}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (Math.abs(h - formHMeasured) > 2) setFormHMeasured(h);
          }}
        >
          <View style={styles.rowTouch}>
            {/* ✅ Bride input — NO overflow:hidden so label can float on border */}
            <View
              style={[
                styles.inputBox,
                {
                  width: inputW,
                  borderRadius: inputRadius,
                  borderColor: Colors.textPrimary,
                  backgroundColor: Colors.white,
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    left: clamp(t.W * 0.03, 8, 16),
                    paddingHorizontal: labelPadH,
                    fontSize: labelFont,
                    color: Colors.textPrimary,
                    backgroundColor: Colors.white,
                    transform: [
                      {
                        translateY: brideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [labelUnfocusedY, labelFocusedY],
                        }),
                      },
                      {
                        scale: brideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.88],
                        }),
                      },
                    ],
                  },
                ]}
              >
                Bride
              </Animated.Text>

              <AnimatedTextInput
                ref={brideTextRef}
                value={brideName}
                cursorColor={Colors.black}
                selectionColor={Colors.black}
                onFocus={() => {
                  setBrideFocused(true);
                  animateLabel(brideAnim, 1);
                  forceCursorStart(brideTextRef);
                }}
                onBlur={() => {
                  setBrideFocused(false);
                  if (!brideName) animateLabel(brideAnim, 0);
                }}
                onChangeText={(val) => {
                  setBrideName(val);
                  if (val) animateLabel(brideAnim, 1);
                }}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => groomTextRef.current?.focus?.()}
                style={[
                  styles.nameInput,
                  {
                    height: inputHAnim,
                    fontSize: fieldFont,
                    paddingTop: inputPadTop,
                    paddingHorizontal: clamp(t.W * 0.03, 8, 16),
                    color: Colors.textPrimary,
                    writingDirection: "ltr",
                    textAlign: brideAlign,
                  },
                ]}
              />
            </View>

            {/* ✅ KNOT */}
            <View
              style={{
                width: knotBoxW,
                alignItems: "center",
                justifyContent: "center",
              }}
              pointerEvents="none"
            >
              <Knot
                width={knotW}
                height={knotH}
                color={knotEnabled ? Colors.primaryPink : KNOT_DISABLED}
                // opacity={knotEnabled ? 1 : 0.75}
              />
            </View>

            {/* ✅ Groom input */}
            <View
              style={[
                styles.inputBox,
                {
                  width: inputW,
                  borderRadius: inputRadius,
                  borderColor: Colors.textPrimary,
                  backgroundColor: Colors.white,
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    left: clamp(t.W * 0.03, 8, 16),
                    paddingHorizontal: labelPadH,
                    fontSize: labelFont,
                    color: Colors.textPrimary,
                    backgroundColor: Colors.white,
                    transform: [
                      {
                        translateY: groomAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [labelUnfocusedY, labelFocusedY],
                        }),
                      },
                      {
                        scale: groomAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.88],
                        }),
                      },
                    ],
                  },
                ]}
              >
                Groom
              </Animated.Text>

              <AnimatedTextInput
                ref={groomTextRef}
                value={groomName}
                cursorColor={Colors.black}
                selectionColor={Colors.black}
                onFocus={() => {
                  setGroomFocused(true);
                  animateLabel(groomAnim, 1);
                  forceCursorStart(groomTextRef);
                }}
                onBlur={() => {
                  setGroomFocused(false);
                  if (!groomName) animateLabel(groomAnim, 0);
                }}
                onChangeText={(val) => {
                  setGroomName(val);
                  if (val) animateLabel(groomAnim, 1);
                }}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                style={[
                  styles.nameInput,
                  {
                    height: inputHAnim,
                    fontSize: fieldFont,
                    paddingTop: inputPadTop,
                    paddingHorizontal: clamp(t.W * 0.03, 8, 16),
                    color: Colors.textPrimary,
                    writingDirection: "ltr",
                    textAlign: groomAlign,
                  },
                ]}
              />
            </View>
          </View>

          <Animated.View style={{ height: gapInsideFormAnim }} />

          <Text style={{ fontSize: labelFont, color: Colors.black }}>
            Your Day
          </Text>

          <TouchableOpacity
            style={[
              styles.dateRow,
              {
                paddingVertical: t.v1 * 0.55,
                paddingHorizontal: t.v1 * 0.6,
                marginTop: isKb ? t.v1 * 0.18 : t.v1 * 0.08,
                borderColor: Colors.black,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            onPress={openDatePicker}
            activeOpacity={0.85}
          >
            <Text
              style={{
                fontSize: fieldFont,
                flex: 1,
                color: Colors.textPrimary,
              }}
            >
              {weddingDate || "Select date"}
            </Text>
            <Calendar
              width={fieldFont * 1.2}
              height={fieldFont * 1.2}
              // fill={Colors.primaryPink}
              style={{
                marginLeft: t.v1 * 0.6,
                // marginTop: -logoTextSize * 0.9,
              }}
            />
          </TouchableOpacity>

          <Animated.View style={{ height: dateGapAnim }} />

          <PinkCalendarModal
            visible={showCalendar}
            selectedDate={weddingDate}
            onClose={() => setShowCalendar(false)}
            onSelectDate={(date) => {
              setWeddingDate(date);
              setShowCalendar(false);
            }}
          />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.footerBtn,
          { left: gutter, right: gutter, bottom: buttonBottomAnim },
        ]}
      >
        <PrimaryButton
          title="GET STARTED"
          enabled={isFormValid}
          loading={loading}
          onPress={onGetStarted}
          height={btnH}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 9999,
    elevation: 0,
  },

  logoRow: { flexDirection: "row", alignItems: "center" },
  logo: { fontWeight: "700" },

  heroWrap: { overflow: "hidden" },
  heroBg: { flex: 1 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroTextWrap: { flex: 1, justifyContent: "flex-end" },

  heroTitle: { fontWeight: "700", textAlign: "center" },
  heroSubtitle: { textAlign: "center" },

  rowTouch: { flexDirection: "row", alignItems: "center" },

  // ✅ REMOVED overflow:'hidden' so floating label can sit ON the border
  inputBox: { borderWidth: 1, position: "relative" },

  // ✅ Label positioned at top:0, animated via translateY
  floatingLabel: {
    position: "absolute",
    zIndex: 2,
    top: 0,
  },

  nameInput: {},

  dateRow: { flexDirection: "row", alignItems: "center" },

  footerBtn: { position: "absolute" },
});
