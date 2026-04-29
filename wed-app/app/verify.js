// app/verify.js
// ✅ SAME button behavior as SignIn:
// - On press -> immediately locks button into dark-pink state
// - Stays dark until navigation happens
// - If verify fails / no navigate -> resets back to normal
// ✅ NEW FLOW:
// - Existing completed user -> /animation-screen
// - New/incomplete user -> /setup-wedding

import ErrorModal from "@/components/ErrorModal";
import NumericKeypad from "@/components/Numerickeypad";
import PrimaryButton from "@/components/PrimaryButton";
import Colors from "@/theme/colors";
import { useLayoutTokens } from "@/ui/layout";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import Edit from "../assets/images/EDIT ICON.svg";
import Heart from "../assets/images/heart.svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOtp } from "../context/OtpContext";
import { useWedding } from "../context/WeddingContext";
import { API_URL } from "../utils/api";
import { setAuthToken } from "../utils/authToken";

const HERO_IMG = require("../assets/images/love-story.jpeg");

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const isValidId = (v) => {
  const s = String(v || "").trim();
  return s.length > 0 && s !== "undefined" && s !== "null";
};
const isNumericId = isValidId;

async function fetchWithApiFallback(apiBase, path, options) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  if (!base) throw new Error("Missing API_URL");

  const urls = [`${base}/api${path}`, `${base}${path}`];

  let last = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      const raw = await res.text();
      let json = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = { raw };
      }
      if (!res.ok) {
        last = { ok: false, url, status: res.status, body: json || raw };
        continue;
      }
      return { ok: true, url, json };
    } catch (e) {
      last = { ok: false, url, error: String(e?.message || e) };
    }
  }
  return last || { ok: false, error: "unknown" };
}

async function ensureDefaultAlbumsOnLogin({ apiBase, weddingId, userId, jwt }) {
  if (!apiBase) return { ok: false, reason: "missing_api_base" };
  const w = String(weddingId || "").trim();
  if (!isNumericId(w)) return { ok: false, reason: "missing_wedding_id" };

  const u = String(userId || "").trim();

  const r = await fetchWithApiFallback(apiBase, `/albums/ensure-defaults`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Album endpoints now require auth — forward the JWT we just received
      // from /verify-otp (it's also already in AsyncStorage).
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({
      weddingId: String(w),
      ...(isNumericId(u) ? { userId: String(u) } : {}),
    }),
  });

  if (!r?.ok) return r;

  // Handle both formats: verify-otp returns { albums: { wedding: { albumId } } }
  // /albums/ensure-defaults returns { visibleAlbums: [...] }
  const json = r?.json || {};
  let weddingAlbumId = json?.albums?.wedding?.albumId;
  let engagementAlbumId = json?.albums?.engagement?.albumId;

  if (!weddingAlbumId && Array.isArray(json?.visibleAlbums)) {
    const vis = json.visibleAlbums;
    const wAlbum = vis.find((a) => (a?.systemKey || '').toLowerCase() === 'wedding' || (a?.title || '').toLowerCase() === 'wedding');
    const eAlbum = vis.find((a) => (a?.systemKey || '').toLowerCase() === 'engagement' || (a?.title || '').toLowerCase() === 'engagement');
    weddingAlbumId = wAlbum?._id || wAlbum?.id;
    engagementAlbumId = eAlbum?._id || eAlbum?.id;
  }

  return {
    ok: true,
    weddingAlbumId: isNumericId(weddingAlbumId) ? String(weddingAlbumId) : "",
    engagementAlbumId: isNumericId(engagementAlbumId)
      ? String(engagementAlbumId)
      : "",
    raw: r.json,
  };
}

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useLayoutTokens();

  const { otpData, setOtpData } = useOtp();
  const {
    setPhone,
    setWeddingData,
    setProfilePhotoUri,
    fetchWeddingFromBackend,
    applyOtpVerifyPayload,
  } = useWedding();

  const contactNo = otpData && otpData.contact_no;

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);

  // ✅ lock dark state same as SignIn
  const [proceedPressed, setProceedPressed] = useState(false);

  // ✅ Modal state
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (msg) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  // ✅ Inline "OTP Sent"
  const [toastText, setToastText] = useState("");
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg) => {
    setToastText(String(msg || ""));
    toastAnim.stopAnimation();
    toastAnim.setValue(0);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  const clearToast = () => {
    toastAnim.stopAnimation();
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setToastText(""));
  };

  const isOtpComplete = otp.every((d) => d !== "");

  useEffect(() => {
    if (!contactNo) router.replace("/signin");
  }, [contactNo, router]);

  const pushDigit = (d) => {
    setOtp((prev) => {
      const next = [...prev];
      const i = next.findIndex((x) => x === "");
      if (i !== -1) next[i] = d;
      return next;
    });
  };

  const backspace = () => {
    setOtp((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i]) {
          next[i] = "";
          break;
        }
      }
      return next;
    });
  };

  const handleVerifyOtp = async () => {
    setProceedPressed(true);

    if (!isOtpComplete || loading) {
      setProceedPressed(false);
      return;
    }

    setLoading(true);
    let didNavigate = false;

    try {
      const res = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_no: contactNo, otp: otp.join("") }),
      });

      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(
          json?.error?.message ||
            json?.message ||
            "Invalid OTP"
        );
      }

      clearToast();

      // Save auth token for API calls (e.g. TV pairing)
      if (json?.jwt) {
        await setAuthToken(json.jwt);
      }

      setOtpData({ ...(otpData || {}), is_verified: true });

      const phoneClean = String(contactNo || "").trim();
      setPhone(phoneClean);

      const weddingIdFromApi =
        json?.weddingId ??
        json?.data?.weddingId ??
        json?.data?.id ??
        json?.wedding?.id ??
        json?.wedding?.data?.id ??
        null;

      const userIdFromApi =
        json?.userId ??
        json?.data?.userId ??
        json?.user?.id ??
        json?.data?.user?.id ??
        null;

      const hasCompletedWeddingSetup =
        typeof json?.hasCompletedWeddingSetup === "boolean"
          ? json.hasCompletedWeddingSetup
          : !!(
              String(json?.brideName || "").trim() &&
              String(json?.groomName || "").trim() &&
              String(json?.weddingDate || "").trim()
            );

      if (isNumericId(weddingIdFromApi)) {
        setWeddingData({ weddingId: String(weddingIdFromApi) });
      }

      // Always fetch profile photo from backend when we have a weddingId.
      // Send the bearer token we just stored above so the backend can lock
      // /photos/profile-photo down without breaking the login flow.
      let profilePhotoSignedUrl = '';
      if (isNumericId(weddingIdFromApi)) {
        try {
          const photoRes = await fetch(
            `${API_URL}/photos/profile-photo?weddingId=${weddingIdFromApi}`,
            json?.jwt
              ? { headers: { Authorization: `Bearer ${json.jwt}` } }
              : undefined
          );
          const photoData = await photoRes.json();
          profilePhotoSignedUrl = photoData?.data?.url || '';
        } catch {}
      }

      // ✅ save verify payload from backend directly into context
      applyOtpVerifyPayload({
        phone: phoneClean,
        weddingId: isNumericId(weddingIdFromApi)
          ? String(weddingIdFromApi)
          : "",
        brideName: json?.brideName || "",
        groomName: json?.groomName || "",
        weddingDate: json?.weddingDate || "",
        hasCompletedWeddingSetup,
        albums: json?.albums || undefined,
        profilePhotoUri: profilePhotoSignedUrl,
      });

      // If backend has no photo yet, fall back to the local permanent file (offline use).
      // Either way, explicitly set the photo so a previous user's photo never bleeds through.
      if (!profilePhotoSignedUrl) {
        try {
          const localPhoto = await AsyncStorage.getItem(
            `USFOREVER_PROFILE_PHOTO_V1:${phoneClean}`
          );
          setProfilePhotoUri(String(localPhoto || ''));
        } catch {
          setProfilePhotoUri('');
        }
      }

      // ✅ optionally pull latest wedding data from backend
      try {
        await fetchWeddingFromBackend({
          weddingId: isNumericId(weddingIdFromApi)
            ? String(weddingIdFromApi)
            : undefined,
          phone: phoneClean,
        });
      } catch {}

      // ✅ ensure default albums and save them too
      if (isNumericId(weddingIdFromApi)) {
        const ensured = await ensureDefaultAlbumsOnLogin({
          apiBase: API_URL,
          weddingId: weddingIdFromApi,
          userId: userIdFromApi,
          jwt: json?.jwt,
        });

        if (ensured?.ok) {
          applyOtpVerifyPayload({
            weddingId: String(weddingIdFromApi),
            phone: phoneClean,
            albums: {
              wedding: { albumId: ensured.weddingAlbumId },
              engagement: { albumId: ensured.engagementAlbumId },
            },
          });
        }
      }

      didNavigate = true;

      if (hasCompletedWeddingSetup) {
        router.replace("/animation");
      } else {
        router.replace("/setup-wedding");
      }
    } catch (e) {
      showError((e && e.message) || "Verification failed");
      setOtp(["", "", "", ""]);
      setProceedPressed(false);
    } finally {
      setLoading(false);
      if (!didNavigate) setProceedPressed(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading) return;

    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_no: contactNo }),
      });

      if (!res.ok) throw new Error("Failed to resend OTP");

      setOtp(["", "", "", ""]);
      showToast("OTP Sent");
    } catch (e) {
      showError((e && e.message) || "Failed to resend OTP");
    }
  };

  const heroH = useMemo(() => clamp(t.H * 0.36, t.H * 0.3, t.H * 0.42), [t.H]);
  const btnH = useMemo(
    () => clamp(t.H * 0.062, t.H * 0.055, t.H * 0.072),
    [t.H],
  );

  const titleSize = useMemo(
    () => clamp(t.W * 0.075, t.W * 0.06, t.W * 0.085),
    [t.W],
  );
  const subSize = useMemo(
    () => clamp(t.W * 0.036, t.W * 0.032, t.W * 0.042),
    [t.W],
  );
  const phoneSize = useMemo(
    () => clamp(t.W * 0.05, t.W * 0.04, t.W * 0.052),
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
  const editSize = useMemo(
    () => clamp(t.W * 0.036, t.W * 0.032, t.W * 0.06),
    [t.W],
  );

  const otpBox = useMemo(() => {
    const usable = Math.min(t.W - t.gutter * 2, t.contentMaxW);
    const gap = usable * 0.05;
    const size = ((usable - gap * 3) / 4) * 0.78;

    return {
      size,
      gap,
      radius: size * 0.22,
      font: size * 0.4,
      borderW: clamp(t.W * 0.003, 1, 2),
    };
  }, [t.W, t.gutter, t.contentMaxW]);

  const overlayOpacity = useMemo(() => clamp(0.38, 0.32, 0.42), []);
  const subtitleOpacity = useMemo(() => clamp(0.85, 0.8, 0.9), []);

  const heroToOtpGap = useMemo(
    () => clamp(t.H * 0.018, t.H * 0.012, t.H * 0.025),
    [t.H],
  );
  const otpToPhoneGap = useMemo(
    () => clamp(t.H * 0.012, t.H * 0.008, t.H * 0.018),
    [t.H],
  );
  const phoneToResendGap = useMemo(
    () => clamp(t.H * 0.003, t.H * 0.002, t.H * 0.008),
    [t.H],
  );
  const proceedToKeypadGap = useMemo(
    () => clamp(t.H * 0.016, t.H * 0.01, t.H * 0.022),
    [t.H],
  );

  const toastTranslateY = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 0],
  });

  const toastFont = useMemo(() => clamp(t.W * 0.028, 10, 12), [t.W]);
  const toastPadY = useMemo(() => clamp(t.H * 0.004, 2, 4), [t.H]);
  const toastPadX = useMemo(() => clamp(t.W * 0.028, 10, 14), [t.W]);

  const toastSlotH = useMemo(() => clamp(t.H * 0.045, 26, 34), [t.H]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors.background }]}
      edges={["top", "left", "right", "bottom"]}
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
              { backgroundColor: Colors.black, opacity: overlayOpacity },
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
            style={{ paddingHorizontal: t.gutter, marginTop: heroH * 0.62 }}
          >
            <Text
              style={[
                styles.heroTitle,
                { fontSize: titleSize, color: Colors.white },
              ]}
            >
              Almost there.
            </Text>

            <Text
              style={{
                fontSize: subSize,
                marginTop: t.v1 * 0.4,
                color: Colors.white,
                opacity: subtitleOpacity,
              }}
            >
              Enter the code we sent you.
            </Text>
          </View>
        </ImageBackground>
      </View>

      {/* Content section */}
      <View
        style={{
          paddingHorizontal: t.gutter,
          paddingTop: heroToOtpGap,
        }}
      >
        <View style={styles.otpRow}>
          {otp.map((d, i) => (
            <View
              key={i}
              style={[
                styles.otpBox,
                {
                  width: otpBox.size,
                  height: otpBox.size,
                  marginHorizontal: otpBox.gap / 2,
                  borderRadius: otpBox.radius,
                  borderWidth: otpBox.borderW,
                  borderColor: "rgba(0,0,0,0.25)",
                  backgroundColor: Colors.white,
                },
              ]}
            >
              <Text
                style={[
                  styles.otpText,
                  { fontSize: otpBox.font, color: Colors.textPrimary },
                ]}
              >
                {d}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.phoneRow, { marginTop: otpToPhoneGap }]}>
          <Text
            style={[
              styles.phoneText,
              { fontSize: phoneSize, color: Colors.textPrimary },
            ]}
          >
            +91 {contactNo}
          </Text>

          <Pressable
            hitSlop={6}
            disabled={loading}
            onPress={() => router.replace("/signin")}
            style={[
              styles.editWrap,
              {
                opacity: loading ? 0.6 : 1,
                marginLeft: clamp(t.W * 0.05, 0, 4),
              },
            ]}
          >
            <Edit width={editSize} height={editSize} />
          </Pressable>
        </View>

        <View style={{ alignItems: "center", marginTop: phoneToResendGap }}>
          <Pressable onPress={handleResendOtp} disabled={loading} hitSlop={8}>
            <Text
              style={[
                styles.resend,
                {
                  fontSize: clamp(t.W * 0.035, t.W * 0.025, t.W * 0.048),
                  color: Colors.textSecondary,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
            >
              Resend OTP
            </Text>
          </Pressable>

          <View
            style={{
              height: toastSlotH,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {!!toastText && (
              <Animated.View
                pointerEvents="none"
                style={{
                  opacity: toastAnim,
                  transform: [{ translateY: toastTranslateY }],
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    paddingHorizontal: toastPadX,
                    paddingVertical: toastPadY,
                    borderRadius: 8,
                    backgroundColor: "rgba(165,72,90,0.16)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: toastFont,
                      fontWeight: "400",
                      color: Colors.textPrimary,
                    }}
                  >
                    {toastText}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>

          <View style={{ width: "100%" }}>
            <PrimaryButton
              title="PROCEED"
              onPress={handleVerifyOtp}
              enabled={isOtpComplete && !loading}
              height={btnH}
              forceDark={loading || proceedPressed}
            />
          </View>
        </View>
      </View>

      {/* Keypad section — outside flex:1, sizes to content, always above safe area */}
      <View
        style={{
          paddingHorizontal: t.gutter,
          paddingTop: proceedToKeypadGap,
          paddingBottom: (insets.bottom > 0 ? insets.bottom : 0) + 28,
        }}
      >
        <NumericKeypad
          onDigit={pushDigit}
          onBackspace={backspace}
          disabled={loading}
          backIcon={require("../assets/images/remove2.svg")}
        />
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

  otpRow: { flexDirection: "row", justifyContent: "center" },
  otpBox: { justifyContent: "center", alignItems: "center" },
  otpText: { fontWeight: "300" },

  phoneRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneText: { fontWeight: "600" },

  editWrap: { padding: 0, alignItems: "center", justifyContent: "center" },

  resend: { textDecorationLine: "underline" },
});