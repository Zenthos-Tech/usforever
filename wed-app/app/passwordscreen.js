import Colors from '@/theme/colors';
import { API_URL } from '@/utils/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import LockIcon from '../assets/images/lock2.svg';
import PrimaryButton from '../components/PrimaryButton';

const joinUrl = (base, path) =>
  `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function PasswordScreen() {
  const router = useRouter();
  const { width: W, height: H } = useWindowDimensions();

  const { slug, t } = useLocalSearchParams();
  const shareSlug = String(slug || '').trim();
  const token = String(t || '').trim();

  const [passcode, setPasscode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // Initial bottom offset — card sits ~28% up from bottom of screen
  const initialBottom = H * 0.28;
  const bottomAnim = useRef(new Animated.Value(initialBottom)).current;

  // Keep cardPad accessible inside keyboard listener without stale closure
  const cardPadRef = useRef(24);

  // When keyboard shows, position card so hint text sits just above keyboard.
  // hint text is at card bottom, inset by cardPad — so bottomAnim = kbH - cardPad + 8
  useEffect(() => {
    const onShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const target = e.endCoordinates.height - cardPadRef.current + 20;
        Animated.timing(bottomAnim, {
          toValue: target,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 180,
          useNativeDriver: false,
        }).start();
      }
    );
    const onHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(bottomAnim, {
          toValue: initialBottom,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 180,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [bottomAnim, initialBottom]);

  // Block hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const layout = useMemo(() => {
    const short = Math.min(W, H);
    const radius = clamp(short * 0.045, 16, 22);
    const cardPad = clamp(short * 0.07, 22, 32);
    cardPadRef.current = cardPad; // keep ref in sync for keyboard listener
    const inputH = clamp(H * 0.068, 50, 58);
    const lockIcon = clamp(short * 0.18, 64, 80);
    const titleSize = clamp(short * 0.055, 18, 22);
    const subSize = clamp(short * 0.04, 14, 16);
    const hintSize = clamp(short * 0.033, 12, 13.5);
    const cardW = clamp(W * 0.94, 320, 460);
    return { radius, cardPad, inputH, lockIcon, titleSize, subSize, hintSize, cardW };
  }, [W, H]);

  const resolveUrl = useMemo(
    () => joinUrl(API_URL, `share-links/resolve/${encodeURIComponent(shareSlug)}`),
    [shareSlug]
  );

  const hasInput = passcode.trim().length === 4;

  const onSubmit = async () => {
    const pc = passcode.trim();
    if (pc.length < 4 || checking) return;
    Keyboard.dismiss();
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`${resolveUrl}?t=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ passcode: pc, token }),
      });
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

      if (res.status === 429) { setError(data?.error || 'Too many attempts. Try again later.'); return; }
      if (!res.ok) { setError(data?.error || data?.message || 'Password incorrect.'); return; }

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
          albums: JSON.stringify(Array.isArray(data.albums) ? data.albums : []),
          accessToken: String(data.accessToken || ''),
        },
      });
    } catch {
      setError('Network error.');
    } finally {
      setChecking(false);
    }
  };

  if (!shareSlug || !token) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textSecondary }}>Invalid link.</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Frosted backdrop — #EEEEEEBD = rgba(238,238,238,0.74) */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={Keyboard.dismiss}
      />

      {/* Card anchored to bottom, animates up with keyboard */}
      <Animated.View
        style={[
          styles.cardWrap,
          { bottom: bottomAnim },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              width: layout.cardW,
              borderRadius: layout.radius * 1.6,
              padding: layout.cardPad,
              backgroundColor: Colors.background ?? '#fff',
            },
          ]}
        >
          {/* Lock icon */}
          <View style={styles.iconWrap}>
            <LockIcon width={layout.lockIcon} height={layout.lockIcon} />
          </View>

          <Text style={[styles.title, { fontSize: layout.titleSize, color: Colors.textPrimary }]}>
            This album is password{'\n'}protected
          </Text>

          <Text style={[styles.subtitle, { fontSize: layout.subSize, color: Colors.textSecondary }]}>
            Enter the password shared by the couple{'\n'}to continue
          </Text>

          <TextInput
            value={passcode}
            onChangeText={(v) => { setPasscode(v); if (error) setError(''); }}
            placeholder="Enter the secured passcode"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry={false}
            maxLength={4}
            keyboardType="numeric"
            style={[
              styles.input,
              {
                height: layout.inputH,
                borderRadius: layout.radius * 0.7,
                borderColor: error ? (Colors.danger ?? '#c00') : (Colors.border ?? '#ddd'),
                color: Colors.textPrimary,
                fontSize: layout.subSize,
              },
            ]}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            autoFocus={false}
          />

          {/* GET STARTED — PrimaryButton with ripple animation */}
          <View style={styles.btnWrap}>
            <PrimaryButton
              title="GET STARTED"
              onPress={onSubmit}
              enabled={hasInput && !checking}
              forceDark={checking}
              height={layout.inputH}
              radius={layout.radius * 0.7}
              style={{ width: '100%' }}
              textStyle={{ fontSize: layout.subSize, fontWeight: '800', letterSpacing: 0.5 }}
            />
          </View>

          {/* Error OR hint */}
          <Text
            style={[
              styles.hint,
              {
                fontSize: layout.hintSize,
                color: error ? (Colors.danger ?? '#c00') : (Colors.textSecondary ?? '#999'),
              },
            ]}
          >
            {error || 'Password incorrect? Ask the couple for access.'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  backdrop: {
    backgroundColor: 'rgba(238,238,238,0.74)',
  },

  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  card: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 24,
  },

  iconWrap: {
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },

  subtitle: {
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 22,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  btnWrap: {
    width: '100%',
    marginBottom: 14,
  },

  hint: {
    textAlign: 'center',
    fontWeight: '300',
  },
});
