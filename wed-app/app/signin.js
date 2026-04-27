import ErrorModal from "@/components/ErrorModal";
import NumericKeypad from "@/components/Numerickeypad";
import PrimaryButton, { PRIMARY_RADIUS_16 } from "@/components/PrimaryButton";
import Colors from "@/theme/colors";
import { useLayoutTokens } from "@/ui/layout";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import Heart from "../assets/images/heart.svg";
import IndiaFlag from "../assets/images/india.svg";
import RemoveIcon from "../assets/images/remove2.svg";

import { useOtp } from "../context/OtpContext";
import { API_URL } from "../utils/api";

const HERO_IMG = require("../assets/images/love-story.jpeg");

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const DARK_PINK = "#A5485A";

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useLayoutTokens();

  const { otpData, setOtpData } = useOtp();
  const [mobile, setMobile] = useState((otpData && otpData.contact_no) || "");
  const [loading, setLoading] = useState(false);
  const [sendPressed, setSendPressed] = useState(false);

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (msg) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const enabled = useMemo(() => mobile.length === 10, [mobile]);

  const heroH = useMemo(() => clamp(t.H * 0.36, t.H * 0.3, t.H * 0.42), [t.H]);

  const heroToPhoneGap = useMemo(
    () => clamp(t.H * 0.03, t.H * 0.02, t.H * 0.05),
    [t.H],
  );

  const inputToBtnGap = useMemo(
    () => clamp(t.H * 0.025, t.H * 0.018, t.H * 0.035),
    [t.H],
  );
  const btnToTrustGap = useMemo(
    () => clamp(t.H * 0.02, t.H * 0.015, t.H * 0.028),
    [t.H],
  );
  const trustToKeypadGap = useMemo(
    () => clamp(t.H * 0.025, t.H * 0.018, t.H * 0.035),
    [t.H],
  );

  const titleSize = useMemo(
    () => clamp(t.W * 0.075, t.W * 0.06, t.W * 0.085),
    [t.W],
  );
  const titleLine = Math.round(titleSize * 1.2);

  const subSize = useMemo(
    () => clamp(t.W * 0.036, t.W * 0.032, t.W * 0.042),
    [t.W],
  );

  const inputH = useMemo(
    () => clamp(t.H * 0.065, t.H * 0.055, t.H * 0.075),
    [t.H],
  );
  const btnH = useMemo(
    () => clamp(t.H * 0.063, t.H * 0.055, t.H * 0.075),
    [t.H],
  );

  const pillRadius = useMemo(
    () => clamp(t.short * 0.03, t.short * 0.024, t.short * 0.04),
    [t.short],
  );
  const pillPx = useMemo(
    () => clamp(t.W * 0.04, t.W * 0.03, t.W * 0.055),
    [t.W],
  );

  const logoTextSize = useMemo(
    () => clamp(t.W * 0.055, t.W * 0.045, t.W * 0.065),
    [t.W],
  );

  const heartSize = useMemo(
    () => clamp(t.W * 0.04, t.W * 0.032, t.W * 0.045),
    [t.W],
  );

  const flagW = useMemo(
    () => clamp(t.W * 0.07, t.W * 0.06, t.W * 0.085),
    [t.W],
  );
  const flagH = useMemo(
    () => clamp(flagW * 0.7, flagW * 0.65, flagW * 0.75),
    [flagW],
  );

  const dividerH = useMemo(
    () => clamp(inputH * 0.45, inputH * 0.38, inputH * 0.52),
    [inputH],
  );
  const dividerW = useMemo(() => clamp(t.W * 0.003, 1, 2), [t.W]);

  const codeSize = useMemo(
    () => clamp(t.W * 0.04, t.W * 0.036, t.W * 0.048),
    [t.W],
  );
  const inputSize = useMemo(
    () => clamp(t.W * 0.042, t.W * 0.038, t.W * 0.05),
    [t.W],
  );
  const placeholderSize = useMemo(
    () => clamp(inputSize * 0.95, inputSize * 0.92, inputSize),
    [inputSize],
  );

  const heroOverlayOpacity = useMemo(() => clamp(0.38, 0.32, 0.42), []);

  const pushDigit = (d) =>
    setMobile((prev) => (prev.length < 10 ? prev + d : prev));
  const backspace = () => setMobile((prev) => prev.slice(0, -1));

  const handleSendOtp = async () => {
    setSendPressed(true);

    if (mobile.trim().length !== 10) {
      setSendPressed(false);
      showError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    let didNavigate = false;

    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_no: mobile.trim() }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { message: text };
      }

      if (!response.ok) {
        setSendPressed(false);
        showError(
          (result && result.error && result.error.message) ||
            result.message ||
            "Failed to send OTP",
        );
        return;
      }

      setOtpData({ contact_no: mobile.trim() });

      didNavigate = true;
      router.push("/verify");
    } catch {
      setSendPressed(false);
      showError("Unable to connect to server");
    } finally {
      setLoading(false);
      if (!didNavigate) setSendPressed(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ErrorModal
        visible={errorVisible}
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />

      <View style={{ height: heroH }}>
        <ImageBackground
          source={HERO_IMG}
          style={styles.heroBg}
          blurRadius={3}
          imageStyle={{ opacity: 0.94 }}
        >
          <View
            style={[
              styles.heroOverlay,
              { backgroundColor: `rgba(0,0,0,${heroOverlayOpacity})` },
            ]}
          />

          <View
            style={[
              styles.heroTopRow,
              { paddingHorizontal: t.gutter, paddingTop: t.v1 },
            ]}
          >
            <Text
              style={[
                styles.logoText,
                { fontSize: logoTextSize, color: Colors.white },
              ]}
            >
              us forever
            </Text>

            <Heart
              width={heartSize}
              height={heartSize}
              fill={Colors.primaryPink}
              style={{
                marginLeft: -logoTextSize * 0.04,
                marginTop: -logoTextSize * 0.9,
              }}
            />
          </View>

          <View
            style={{ paddingHorizontal: t.gutter, marginTop: heroH * 0.48 }}
          >
            <Text
              style={[
                styles.heroTitle,
                {
                  fontSize: titleSize,
                  lineHeight: titleLine,
                  color: Colors.white,
                },
              ]}
            >
              Let&apos;s continue your{"\n"}story.
            </Text>

            <Text
              style={[
                styles.heroSubtitle,
                { fontSize: subSize, marginTop: t.v1 },
              ]}
            >
              Enter your mobile number to continue your journey.
            </Text>
          </View>
        </ImageBackground>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: t.gutter,
          paddingBottom: insets.bottom + t.v2,
          paddingTop: heroToPhoneGap,
        }}
      >
        <Pressable
          style={[
            styles.inputPill,
            {
              height: inputH,
              borderRadius: pillRadius,
              paddingHorizontal: pillPx,
              borderColor: Colors.border,
              backgroundColor: Colors.white,
            },
          ]}
        >
          <View
            style={[
              styles.flagBox,
              {
                width: flagW,
                height: flagH,
                borderRadius: clamp(flagW * 0.16, flagW * 0.12, flagW * 0.2),
                backgroundColor: Colors.white,
                padding: Math.round(clamp(flagW * 0.06, 1, 3)),
              },
            ]}
          >
            <IndiaFlag width="100%" height="100%" />
          </View>

          <Text
            style={[
              styles.code,
              {
                fontSize: codeSize,
                color: Colors.textPrimary,
                marginHorizontal: pillPx * 0.55,
              },
            ]}
          >
            +91
          </Text>

          <View
            style={[
              styles.dividerV,
              {
                width: dividerW,
                height: dividerH,
                backgroundColor: Colors.border,
                marginHorizontal: pillPx * 0.9,
              },
            ]}
          />

          <Text
            numberOfLines={1}
            style={[
              styles.inputText,
              { fontSize: inputSize, color: Colors.textPrimary },
              mobile.length === 0 && {
                color: Colors.textSecondary,
                fontSize: placeholderSize,
              },
            ]}
          >
            {mobile.length === 0 ? "Enter your Mobile number" : mobile}
          </Text>
        </Pressable>

        <View style={{ marginTop: inputToBtnGap }}>
          <PrimaryButton
            title="SEND OTP"
            onPress={handleSendOtp}
            enabled={enabled}
            height={btnH}
            radius={PRIMARY_RADIUS_16}
            forceDark={loading}
          />
        </View>

        <Text
          style={[
            styles.trust,
            {
              fontSize: subSize,
              marginTop: btnToTrustGap,
              color: Colors.textSecondary,
            },
          ]}
        >
          By continuing, you trust us to care for your{"\n"}
          <Text style={[styles.trustBold, { color: Colors.textSecondary }]}>
            memories and your data.
          </Text>
        </Text>

        <View style={{ flex: 1, marginTop: trustToKeypadGap }}>
          <NumericKeypad
            onDigit={pushDigit}
            onBackspace={backspace}
            disabled={loading}
            backIcon={RemoveIcon}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  heroBg: { flex: 1 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },

  heroTopRow: { flexDirection: "row", alignItems: "center" },

  logoText: { fontWeight: "700", letterSpacing: 0.2 },

  heroTitle: { fontWeight: "800" },

  heroSubtitle: { color: "rgba(255,255,255,0.85)" },

  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  flagBox: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  flagImg: { width: "100%", height: "100%", resizeMode: "contain" },

  code: { fontWeight: "600" },

  dividerV: {},

  inputText: { flex: 1 },

  trust: { textAlign: "center" },
  trustBold: { fontWeight: "700" },
});