import Colors from '@/theme/colors';
import { API_URL } from '@/utils/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

const joinUrl = (base, path) =>
  `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

// ── Deep-link redirect constants ──────────────────────────────────────────────
const ANDROID_PACKAGE = 'com.anonymous.WeddingApp';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const APP_STORE_URL = 'https://apps.apple.com/app/id'; // TODO: add your App Store ID

// EAS internal-distribution page — used as the fallback in dev/preview builds
// Replace with your own: https://expo.dev/accounts/YOUR_ACCOUNT/projects/WeddingApp/builds
const DEV_BUILD_URL = `https://expo.dev/projects/cf85359a-0afa-4351-818c-26fa1821447d`;
// ─────────────────────────────────────────────────────────────────────────────

export default function ShareGate() {
  const router = useRouter();
  const { slug, t } = useLocalSearchParams();

  const shareSlug = String(slug || '').trim();
  const token = String(t || '').trim();

  const resolveUrl = useMemo(() => {
    return joinUrl(API_URL, `share-links/resolve/${encodeURIComponent(shareSlug)}`);
  }, [shareSlug]);

  const [err, setErr] = useState('');

  // ── Web: try to open the installed app, fall back to store / dev build ──────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!shareSlug || !token) return;

    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const fallbackUrl = DEV_BUILD_URL; // swap to PLAY_STORE_URL / APP_STORE_URL once live

    if (isAndroid) {
      // Android Intent URL: opens app if installed, otherwise falls back automatically
      const encodedFallback = encodeURIComponent(fallbackUrl);
      const intentUrl =
        `intent://share/${encodeURIComponent(shareSlug)}?t=${encodeURIComponent(token)}` +
        `#Intent;scheme=usforever;package=${ANDROID_PACKAGE}` +
        `;S.browser_fallback_url=${encodedFallback};end`;
      window.location.href = intentUrl;
      return;
    }

    // iOS / desktop: try custom scheme, redirect after timeout if app didn't open
    const deepLink = `usforever://share/${encodeURIComponent(shareSlug)}?t=${encodeURIComponent(token)}`;
    window.location.href = deepLink;

    let appOpened = false;
    const onHide = () => { appOpened = document.hidden; };
    document.addEventListener('visibilitychange', onHide);

    const timer = setTimeout(() => {
      if (!appOpened) window.location.href = fallbackUrl;
    }, 2500);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [shareSlug, token]);
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Native only — web redirects above handle the browser case
    if (Platform.OS === 'web') return;

    let cancelled = false;

    async function run() {
      setErr('');

      if (!shareSlug || !token) {
        setErr('Invalid link.');
        return;
      }

      try {
        const finalUrl = `${resolveUrl}?t=${encodeURIComponent(token)}`;

        const res = await fetch(finalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ token }),
        });

        const raw = await res.text();

        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { raw };
        }

        if (cancelled) return;

        // 401 means passcode required — route to password screen.
        // Guard against "Token required" (shouldn't happen in normal flow, but
        // show a plain error instead of looping to the password screen).
        if (res.status === 401) {
          const isPasscodeRequired =
            data?.requiresPasscode === true ||
            data?.error === 'Passcode required';
          if (isPasscodeRequired) {
            if (!cancelled) {
              cancelled = true;
              // Navigate to create-album first so it renders as the blurred
              // background behind the password modal. Create-album will push
              // passwordscreen on top when it sees needsPassword=true.
              router.replace({
                pathname: '/create-album',
                params: {
                  slug: shareSlug,
                  t: token,
                  needsPassword: 'true',
                  role: String(data?.role || 'guest'),
                  coupleName: String(data?.coupleName || ''),
                  brideName: String(data?.brideName || ''),
                  groomName: String(data?.groomName || ''),
                  weddingDate: String(data?.weddingDate || ''),
                  weddingTitle: String(data?.weddingTitle || ''),
                  albums: JSON.stringify(Array.isArray(data?.albums) ? data.albums : []),
                },
              });
            }
          } else {
            setErr(data?.error || 'Invalid or missing token.');
          }
          return;
        }

        if (!res.ok) {
          const msg = data?.error || data?.message || 'Unable to open link.';
          if (res.status === 403) setErr(msg || 'Link expired.');
          else if (res.status === 404) setErr(msg || 'Invalid link.');
          else setErr(msg);
          return;
        }

    router.replace({
  pathname: '/create-album',
  params: {
    weddingId: String(data.weddingId || ''),
    albumId: String(data.albumId || ''),
    albumName: String(data.albumName || ''),
    role: String(data.role || ''),
    slug: shareSlug,
    t: token,

    brideName: String(data.brideName || ''),
    groomName: String(data.groomName || ''),
    coupleName: String(data.coupleName || ''),
    weddingDate: String(data.weddingDate || ''),
    weddingTitle: String(data.weddingTitle || ''),

    // All visible albums for this wedding so the guest sees the full list
    albums: JSON.stringify(Array.isArray(data.albums) ? data.albums : []),
    accessToken: String(data.accessToken || ''),
  },
});
      } catch {
        if (!cancelled) setErr('Network error.');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [shareSlug, token, resolveUrl, router]);

  if (err) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background ?? '#fff' }]}>
        <Text style={{ color: Colors.textSecondary }}>{err}</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background ?? '#fff' }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: Colors.textSecondary, textAlign: 'center' }}>
          Opening in app…
        </Text>
        <Text style={{ marginTop: 6, fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }}>
          If nothing happens, the app may not be installed.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: Colors.background ?? '#fff' }]}>
      <ActivityIndicator />
      <Text style={{ marginTop: 10, color: Colors.textSecondary }}>Opening…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});