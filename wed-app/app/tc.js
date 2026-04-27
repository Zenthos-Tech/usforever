// components/tc.js
// ✅ Same UI as your privacy.js (blur + floating sheet + fixed header/logo/title)
// ✅ AboutUs visible behind + BLUR (expo-blur)
// ✅ Top 20% visible
// ✅ Divider line below header
// ✅ Close icon TOP-RIGHT (from assets) + closes screen (router.back / replace)
// ✅ Only text scrolls
// ✅ Footer space reduced
// ✅ T&C TEXT kept same as your TC (1–16) — DO NOT CHANGE

import Colors from '@/theme/colors';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  BackHandler,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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

export default function TC() {
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
  
      closeIcon: clamp(28 * s, 24, 32),
      closeTap: clamp(34 * s, 30, 40),

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

      // ✅ footer less (keep very small)
      sheetPadBottom: clamp(insets.bottom, 0, 12),

      // ✅ top 20% visible like your SS
      topGap: Math.round(H * 0.2),
      sheetHeight: Math.round(H * 0.9),
    };
  }, [W, H, insets.bottom]);

  const close = useCallback(() => {
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    router.replace('/profile'); // change if needed
  }, [router]);

  useFocusEffect(
    useMemo(() => {
      const onBack = () => {
        close();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [close])
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.overlayTransparent}>
        {/* ✅ Blur so AboutUs is visible behind */}
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

        {/* tap outside closes */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        {/* ✅ top 20% gap stays visible */}
        <View style={{ height: ui.topGap }} />

        <View
          style={[
            styles.sheet,
            {
              height: ui.sheetHeight,
              width: '100%',
              borderTopLeftRadius: ui.sheetRadius,
              borderTopRightRadius: ui.sheetRadius,
              backgroundColor: Colors.background,

              paddingTop: clamp(ui.gutter * 0.65, 10, 16),
              paddingHorizontal: ui.gutter,

              // ✅ footer less (NO extra big padding)
              paddingBottom: ui.sheetPadBottom + 18,
            },
          ]}
        >
          {/* Fixed header */}
          <View style={styles.headerRow}>
            <View style={{ width: ui.closeTap }} />
            <Text style={[styles.headerTitle, { fontSize: ui.modalTitle, color: Colors.textPrimary }]}>
              Privacy Policy
            </Text>

            {/* ✅ Close icon top-right */}
            <Pressable onPress={close} hitSlop={12} style={{ width: ui.closeTap, alignItems: 'flex-end' }}>
          <CloseIcon width={ui.closeIcon} height={ui.closeIcon} color={Colors.textPrimary} />
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

         <View style={{ alignSelf: 'center', marginTop: ui.logoTop }}>
  <LogoTitle width={ui.logoW} height={ui.logoH} />
</View>

          <Text style={[styles.brandTitle, { fontSize: ui.brandTitle, marginTop: 10 }]}>
            <Text style={{ color: Colors.primaryPink }}>UsForever</Text>
            <Text style={{ color: Colors.textSecondary }}> T&amp;C</Text>
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
                marginBottom: 4, // ✅ footer less
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
              {/* ✅ TC TEXT (same as before) */}
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine }]}>
                Welcome to <Text style={styles.h2}>UsForever</Text>
              </Text>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                These Terms &amp; Conditions (“Terms”) govern your access to and use of our mobile application, web
                application, and TV application (collectively, the “Service”).
              </Text>

              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, please do
                not use the Service.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>1. Eligibility</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You must:
              </Text>
              <Bullet ui={ui}>Be at least 18 years old (or legal age in your jurisdiction)</Bullet>
              <Bullet ui={ui}>Have the legal authority to enter into this agreement</Bullet>
              <Bullet ui={ui}>Provide accurate information during registration</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You are responsible for maintaining the confidentiality of your account credentials.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>2. Description of Service</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                <Text style={styles.h2}>UsForever</Text> provides a private digital platform for:
              </Text>
              <Bullet ui={ui}>Storing wedding photos and videos</Bullet>
              <Bullet ui={ui}>Organizing albums</Bullet>
              <Bullet ui={ui}>Facial recognition-based discovery</Bullet>
              <Bullet ui={ui}>Sharing with family, guests, and photographers</Bullet>
              <Bullet ui={ui}>TV viewing integration</Bullet>
              <Bullet ui={ui}>Subscription-based storage services</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may update, modify, or discontinue features at any time.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>3. Account Responsibility</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You agree to:
              </Text>
              <Bullet ui={ui}>Provide accurate information</Bullet>
              <Bullet ui={ui}>Keep your login details secure</Bullet>
              <Bullet ui={ui}>Not share your account access improperly</Bullet>
              <Bullet ui={ui}>Notify us immediately of unauthorized access</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You are responsible for all activity under your account.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>4. User Content</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You retain ownership of the photos, videos, and content you upload (“User Content”).
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                By uploading content, you grant <Text style={styles.h2}>UsForever</Text> a limited license to:
              </Text>
              <Bullet ui={ui}>Store your content</Bullet>
              <Bullet ui={ui}>Process it for facial recognition</Bullet>
              <Bullet ui={ui}>Display it to users you authorize</Bullet>
              <Bullet ui={ui}>Provide Service functionality</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We do not claim ownership of your content.
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You agree not to upload:
              </Text>
              <Bullet ui={ui}>Illegal content</Bullet>
              <Bullet ui={ui}>Copyright-infringing content</Bullet>
              <Bullet ui={ui}>Harmful, abusive, or explicit content</Bullet>
              <Bullet ui={ui}>Content that violates privacy laws</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We reserve the right to remove content that violates these Terms.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>5. Facial Recognition Feature</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                If you use face-based discovery:
              </Text>
              <Bullet ui={ui}>Facial data is processed only to match photos within your album</Bullet>
              <Bullet ui={ui}>You may delete face data at any time</Bullet>
              <Bullet ui={ui}>You are responsible for obtaining consent from individuals whose photos you upload</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We are not responsible for misuse of images uploaded without proper consent.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>6. Sharing &amp; Access Links</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You may generate shareable links for:
              </Text>
              <Bullet ui={ui}>Family &amp; friends</Bullet>
              <Bullet ui={ui}>Photographers</Bullet>
              <Bullet ui={ui}>Guests</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You control:
              </Text>
              <Bullet ui={ui}>Expiry duration</Bullet>
              <Bullet ui={ui}>Passcode protection</Bullet>
              <Bullet ui={ui}>Revocation of links</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We are not liable for misuse of links shared publicly.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>7. Subscription &amp; Payments</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Certain features require a paid subscription.
              </Text>
              <Bullet ui={ui}>Pricing is displayed at checkout</Bullet>
              <Bullet ui={ui}>Payments are processed through third-party providers</Bullet>
              <Bullet ui={ui}>Subscriptions may auto-renew unless canceled</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We reserve the right to modify pricing with notice.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>8. Storage &amp; Data Limits</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Storage limits are based on your selected plan.
              </Text>
              <Bullet ui={ui}>You may need to upgrade your plan</Bullet>
              <Bullet ui={ui}>Uploading may be restricted until space is available</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We are not responsible for content lost due to account termination or plan expiration.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>9. Intellectual Property</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                All platform elements including design, logo, software, branding, and interface are owned by{' '}
                <Text style={styles.h2}>UsForever</Text> and protected by intellectual property laws.
              </Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You may not copy, modify, distribute, or reverse engineer the Service.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>10. Prohibited Use</Text>
              <Bullet ui={ui}>Use the platform for unlawful purposes</Bullet>
              <Bullet ui={ui}>Attempt to hack or disrupt the system</Bullet>
              <Bullet ui={ui}>Abuse facial recognition features</Bullet>
              <Bullet ui={ui}>Share malware or harmful files</Bullet>
              <Bullet ui={ui}>Violate privacy rights of others</Bullet>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>11. Termination</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may suspend or terminate your account if:
              </Text>
              <Bullet ui={ui}>You violate these Terms</Bullet>
              <Bullet ui={ui}>You misuse the platform</Bullet>
              <Bullet ui={ui}>Required by law</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Upon termination, access will be revoked and content may be permanently deleted after a retention period.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>12. Limitation of Liability</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                To the maximum extent permitted by law, <Text style={styles.h2}>UsForever</Text> shall not be liable for:
              </Text>
              <Bullet ui={ui}>Data loss due to user error</Bullet>
              <Bullet ui={ui}>Unauthorized sharing by invited users</Bullet>
              <Bullet ui={ui}>Service interruptions</Bullet>
              <Bullet ui={ui}>Indirect or consequential damages</Bullet>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                Your use of the Service is at your own risk.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>13. Disclaimer of Warranties</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                The Service is provided “as is” and “as available.”
              </Text>
              <Bullet ui={ui}>Uninterrupted access</Bullet>
              <Bullet ui={ui}>Error-free operation</Bullet>
              <Bullet ui={ui}>Absolute data security</Bullet>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>14. Indemnification</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                You agree to indemnify and hold harmless <Text style={styles.h2}>UsForever</Text> from claims arising out of:
              </Text>
              <Bullet ui={ui}>Your content uploads</Bullet>
              <Bullet ui={ui}>Violation of these Terms</Bullet>
              <Bullet ui={ui}>Misuse of shared access</Bullet>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>15. Governing Law</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                These Terms shall be governed by the laws of India.
              </Text>

              <Text style={[styles.h2, { fontSize: ui.h2Size, marginTop: 12 }]}>16. Changes to Terms</Text>
              <Text style={[styles.pMuted, { fontSize: ui.pSize, lineHeight: ui.pLine, marginTop: ui.pGap }]}>
                We may update these Terms periodically. Continued use of the Service after updates constitutes acceptance
                of the revised Terms.
              </Text>
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

  // floating card look
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