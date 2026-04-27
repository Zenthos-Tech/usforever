// components/privacy.js
// ✅ Works with Stack presentation: 'transparentModal'
// ✅ AboutUs visible in top 20%
// ✅ AboutUs BLURRED behind (expo-blur)
// ✅ Header + logo + "Privacy Statement" FIXED
// ✅ Only text scrolls
// ✅ Footer space reduced
// ✅ × closes
// ✅ Rounded corners (floating card look)

import Colors from '@/theme/colors';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  BackHandler,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CloseIcon from '../assets/images/close.svg';
import LogoTitle from '../assets/images/logo-title.svg';
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

function Bullet({ children, ui }) {
  return (
    <View style={[styles.bulletRow, { marginTop: ui.pGap, paddingRight: ui.gutter * 0.35 }]}>
      <Text style={[styles.bulletDot, { fontSize: ui.bulletDot, lineHeight: ui.pLine, marginRight: ui.bulletGap }]}>
        •
      </Text>
      <Text style={[styles.bulletText, { fontSize: ui.pSize, lineHeight: ui.pLine }]}>{children}</Text>
    </View>
  );
}

export default function Privacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const ui = useMemo(() => {
    const gutter = clamp(W * 0.05, 12, 24);
    const s = W / 375;

    return {
      gutter,
      sheetRadius: clamp(gutter * 0.95, 14, 20),
      modalTitle: clamp(16 * s, 14, 18),
      closeSize: clamp(28 * s, 24, 32),

      logoW: clamp(W * 0.42, 140, 190),
      logoH: clamp(36 * s, 28, 42),
      logoTop: clamp(gutter * 0.55, 8, 14),
      brandTitle: clamp(20 * s, 18, 26),

      cardBg: '#ECECEC',
      cardRadius: clamp(gutter * 0.8, 12, 18),
      cardPad: clamp(gutter * 0.75, 12, 18),
   cardSide: clamp(gutter * 0.1, 1, 2),
      h2Size: clamp(15 * s, 13.5, 17),
      h3Size: clamp(14 * s, 12.8, 16),

      pSize: clamp(13.4 * s, 12.5, 15),
      pLine: clamp(clamp(13.4 * s, 12.5, 15) * 1.38, 17, 22),
      pGap: clamp(gutter * 0.32, 5, 10),

      bulletDot: clamp(16 * s, 14, 18),
      bulletGap: clamp(gutter * 0.5, 6, 12),

      sheetPadBottom: clamp(insets.bottom, 0, 14),
      sheetHeight: Math.round(H * 0.9),
    };
  }, [W, H, insets.bottom]);

const close = () => {
  // if there is something to go back to, go back
  if (router.canGoBack?.()) {
    router.back();
    return;
  }
  // otherwise send user to a safe screen
  router.replace('/profile'); // <-- change to your correct route

};
useFocusEffect(
  useMemo(() => {
    const onBack = () => {
      close();
      return true; // prevent default back
    };

    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      onBack
    );

    return () => sub.remove();
  }, [close])
);
  return (
    <SafeAreaView style={styles.root}>
      {/* ✅ transparent overlay (AboutUs visible) */}
      <View style={styles.overlayTransparent}>
        {/* ✅ BLUR behind sheet */}
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

        {/* tap outside closes */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

    <View
  style={[
    styles.sheet,
    {
      height: ui.sheetHeight,

      // ✅ 100% width
      width: '100%',

      // ✅ rounded corners (top only, because full width)
      borderTopLeftRadius: ui.sheetRadius,
      borderTopRightRadius: ui.sheetRadius,

      backgroundColor: Colors.background,
      paddingTop: clamp(ui.gutter * 0.65, 10, 16),
      paddingHorizontal: ui.gutter,
      paddingBottom: ui.sheetPadBottom + 18,
    },
  ]}
>
          {/* Fixed header */}
          <View style={styles.headerRow}>
            <View style={{ width: ui.closeSize }} />
            <Text style={[styles.headerTitle, { fontSize: ui.modalTitle, color: Colors.textPrimary }]}>
              Privacy Policy
            </Text>
           <Pressable
  onPress={close}
  hitSlop={12}
  style={{ width: ui.closeSize, alignItems: 'flex-end', justifyContent: 'center' }}
>
<Pressable
  onPress={close}
  hitSlop={12}
  style={{ width: ui.closeSize, alignItems: 'flex-end', justifyContent: 'center' }}
>
  <CloseIcon width={ui.closeSize} height={ui.closeSize} />
</Pressable>
</Pressable>
          </View>

<View
  style={[
    styles.divider,
    {
      backgroundColor: Colors.border,
      marginTop: 6,
      marginBottom: 8,

      // ✅ make divider 100% width (ignore sheet padding)
      alignSelf: 'stretch',
      marginLeft: -ui.gutter,
      marginRight: -ui.gutter,
    },
  ]}
/>

      <LogoTitle
  width={ui.logoW}
  height={ui.logoH}
  style={{ alignSelf: 'center', marginTop: ui.logoTop }}
/>
          <Text style={[styles.brandTitle, { fontSize: ui.brandTitle, marginTop: 10 }]}>
            <Text style={{ color: Colors.primaryPink }}>UsForever</Text>
            <Text style={{ color:"#666263"
 }}> Privacy Statement</Text>
          </Text>

          {/* Only text scrolls */}
          <View
            style={[
              styles.card,
              {
                flex: 1,
                backgroundColor: ui.cardBg,
                borderRadius: ui.cardRadius,
                padding: ui.cardPad,
                marginHorizontal: ui.cardSide,
                marginBottom: 8,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
             <Text>
  <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine }]}>
    Welcome to{' '}
  </Text>
  <Text style={[styles.h2, { fontSize: ui.h2Size }]}>
    UsForever
  </Text>
</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine }]}>
                We are committed to protecting your privacy and ensuring that your wedding memories and personal data
                remain safe, secure, and private. This Privacy Policy explains how we collect, use, store, and protect
                your information when you use our mobile app, web app, and TV app (collectively, the “Service”).
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>1. Information We Collect</Text>

              <Text style={[styles.h3, { fontSize: ui.h3Size, marginTop: 10 }]}>1.1 Information You Provide</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                When you use <Text style={styles.h2}>UsForever</Text>, we may collect:
              </Text>

              <Bullet ui={ui}>Your name</Bullet>
              <Bullet ui={ui}>Mobile number and email address</Bullet>
              <Bullet ui={ui}>Wedding details (e.g., bride/groom names, wedding date, venue)</Bullet>
              <Bullet ui={ui}>Photos and videos you upload</Bullet>
              <Bullet ui={ui}>Nicknames, notes, and captions</Bullet>
              <Bullet ui={ui}>Subscription and billing information (processed via third-party payment providers)</Bullet>

              <Text style={[styles.h3, { fontSize: ui.h3Size, marginTop: 12 }]}>1.2 Facial Recognition Data</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                If you use the “Find My Photos” feature:
              </Text>

              <Bullet ui={ui}>We process a photo you provide to detect and match faces within your album.</Bullet>
              <Bullet ui={ui}>Facial data is used only for matching within your album.</Bullet>
              <Bullet ui={ui}>We do not permanently store facial biometric templates unless explicitly stated.</Bullet>
              <Bullet ui={ui}>You may delete your face data at any time.</Bullet>

              <Text style={[styles.h3, { fontSize: ui.h3Size, marginTop: 12 }]}>
                1.3 Automatically Collected Information
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may automatically collect:
              </Text>

              <Bullet ui={ui}>Device information</Bullet>
              <Bullet ui={ui}>App usage activity</Bullet>
              <Bullet ui={ui}>Log data</Bullet>
              <Bullet ui={ui}>IP address</Bullet>
              <Bullet ui={ui}>Crash reports</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                This helps us improve performance and reliability.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>2. How We Use Your Information</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We use your information to:
              </Text>

              <Bullet ui={ui}>Provide and maintain the Service</Bullet>
              <Bullet ui={ui}>Store and organize your wedding photos and videos</Bullet>
              <Bullet ui={ui}>Enable sharing with invited users</Bullet>
              <Bullet ui={ui}>Provide facial recognition within albums</Bullet>
              <Bullet ui={ui}>Manage subscriptions and payments</Bullet>
              <Bullet ui={ui}>Improve app performance and features</Bullet>
              <Bullet ui={ui}>Ensure account security</Bullet>
              <Bullet ui={ui}>Prevent fraud or misuse</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We do not sell your personal data.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>
                3. How We Store and Protect Your Data
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We use secure cloud infrastructure and industry-standard encryption to protect your data. Security
                measures include:
              </Text>

              <Bullet ui={ui}>Encrypted data transmission (HTTPS)</Bullet>
              <Bullet ui={ui}>Secure cloud storage</Bullet>
              <Bullet ui={ui}>Access controls</Bullet>
              <Bullet ui={ui}>Regular monitoring</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                While we implement strong safeguards, no system can guarantee absolute security.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>4. Sharing of Information</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may share data only in the following situations:
              </Text>

              <Text style={[styles.h3, { fontSize: ui.h3Size, marginTop: 10 }]}>4.1 With Invited Users</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Photos and videos may be visible to:
              </Text>

              <Bullet ui={ui}>Family members</Bullet>
              <Bullet ui={ui}>Photographers</Bullet>
              <Bullet ui={ui}>Guests</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                — but only if you provide them access.
              </Text>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You control:
              </Text>

              <Bullet ui={ui}>Passcode protection</Bullet>
              <Bullet ui={ui}>Expiry dates</Bullet>
              <Bullet ui={ui}>Link revocation</Bullet>

              <Text style={[styles.h3, { fontSize: ui.h3Size, marginTop: 12 }]}>4.2 With Service Providers</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may share necessary data with trusted third-party providers for:
              </Text>

              <Bullet ui={ui}>Cloud storage</Bullet>
              <Bullet ui={ui}>Payment processing</Bullet>
              <Bullet ui={ui}>Analytics</Bullet>
              <Bullet ui={ui}>Customer support</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                These providers are contractually obligated to protect your data.
              </Text>

              <Text style={[styles.h3, { fontSize: ui.h3Size, marginTop: 12 }]}>4.3 Legal Requirements</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may disclose information if required by law or valid legal process.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>5. Data Retention</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We retain your data as long as:
              </Text>

              <Bullet ui={ui}>Your account is active</Bullet>
              <Bullet ui={ui}>You maintain a subscription</Bullet>
              <Bullet ui={ui}>Required for legal or compliance purposes</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You may request account deletion at any time.
              </Text>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Upon deletion:
              </Text>

              <Bullet ui={ui}>Your personal data will be removed</Bullet>
              <Bullet ui={ui}>Album data will be permanently deleted after a retention window (if applicable)</Bullet>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>6. Your Rights and Choices</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Depending on your jurisdiction, you may have the right to:
              </Text>

              <Bullet ui={ui}>Access your personal data</Bullet>
              <Bullet ui={ui}>Correct inaccurate data</Bullet>
              <Bullet ui={ui}>Delete your account and data</Bullet>
              <Bullet ui={ui}>Withdraw consent for facial recognition</Bullet>
              <Bullet ui={ui}>Control sharing settings</Bullet>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                To exercise these rights, contact us at:
              </Text>

              <Text
                style={[
                  styles.pMuted,
                  { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap, color: Colors.primaryPink, fontWeight: '700' },
                ]}
              >
                usforever@gmail.com
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>7. Children’s Privacy</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                <Text style={styles.h2}>UsForever</Text> is not intended for children under 13 (or applicable local age).
                We do not knowingly collect personal data from children.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>8. International Data Transfers</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Your information may be processed in countries other than your own. We ensure appropriate safeguards are in
                place for international data transfers.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>9. Changes to This Policy</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may update this Privacy Policy from time to time. Changes will be posted within the app or on our website
                with an updated date. Continued use of the Service constitutes acceptance of any updates.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>10. Contact Us</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                If you have questions about this Privacy Policy or your data, contact:
              </Text>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Email: usforever@gmail.com
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Company Name: UsForever
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Address: [Insert Company Address]
              </Text>

              {/* keep rest of your full text same */}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  overlayTransparent: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },

  // ✅ Added shadow so rounded card looks premium (safe on Android too)
  sheet: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '800' },
  divider: { height: 1 },

  brandTitle: { textAlign: 'center', fontWeight: '900', marginBottom: 10 },
  card: {},

  pMuted: { color:"#666263",fontWeight:400
 },
  h2: { fontWeight: '700', color:"#666263"
 },
  h3: { fontWeight: '700', color:"#666263"
 },
  bold: { fontWeight: '800', color: Colors.textPrimary, includeFontPadding: false },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bulletDot: { color: Colors.textSecondary, opacity: 0.75 },
  bulletText: { flex: 1, color:"#666263"
, fontWeight:400 },
});