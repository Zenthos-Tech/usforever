// app/AboutUs.js
// ✅ KEEP UI SAME
// ✅ Change ONLY navigation behavior:
//    - Privacy Policy row -> opens component screen: components/privacy.js
//    - Terms & Conditions row -> opens component screen: components/tc.js
// ✅ No more modals here (removed showPrivacy/showTC + PolicyModal/TCModal)
// ✅ Icons replaced with SVG

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';
import ProfileFooterLogo, { FOOTER_BASE_HEIGHT } from '../components/footerlogo';

import BackIcon from '../assets/images/Back icon.svg';
import { default as ChevronDownIcon, default as ChevronRightIcon } from '../assets/images/downicon.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function AboutUs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const t = useLayoutTokens() || {};

  const [showOffer, setShowOffer] = useState(false);
  const shouldScroll = !!showOffer;

  const ui = useMemo(() => {
    const gutter = clamp((t?.gutter ?? t?.pad ?? W * 0.05) || W * 0.05, 12, 24);
    const s = W / 375;

    const headerPadH = clamp(gutter * 0.9, 12, 22);
    const headerPadV = clamp(gutter * 0.6, 10, 18);
    const headerTitle = clamp(16 * s, 14, 18);
    const back = clamp(20 * s, 18, 24);
    const backTapW = clamp(44 * s, 38, 54);

    const containerPad = clamp(gutter * 0.95, 14, 26);

    const hero = clamp(26 * s, 20, 30);
    const heroLine = clamp(hero * 1.25, 26, 38);

    const section = clamp(22 * s, 18, 26);

    const body = clamp(14.5 * s, 13, 16);
    const bodyMuted = clamp(13 * s, 12, 15);
    const bodyLine = clamp(body * 1.38, 18, 24);
    const mutedLine = clamp(bodyMuted * 1.42, 18, 24);

    const rowText = clamp(16 * s, 14, 18);
    const rowPadV = clamp(gutter * 0.5, 10, 15);
    const chevron = clamp(18 * s, 16, 22);

    const dividerGapA = clamp(gutter * 0.4, 6, 10);
    const dividerGapB = clamp(gutter * 0.15, 4, 8);

    const listItem = clamp(14 * s, 13, 16);
    const listGap = clamp(gutter * 0.35, 6, 12);
    const listIndent = clamp(gutter * 0.25, 4, 10);

    const footerReserve = FOOTER_BASE_HEIGHT + insets.bottom;

    return {
      gutter,
      headerPadH,
      headerPadV,
      headerTitle,
      back,
      backTapW,
      containerPad,
      hero,
      heroLine,
      section,
      body,
      bodyMuted,
      bodyLine,
      mutedLine,
      rowText,
      rowPadV,
      chevron,
      dividerGapA,
      dividerGapB,
      listItem,
      listGap,
      listIndent,
      footerReserve,
    };
  }, [t, W, H, insets.bottom]);

  const Content = (
    <View style={[styles.container, { padding: ui.containerPad }]}>
      <Text style={[styles.hero, { fontSize: ui.hero, lineHeight: ui.heroLine }]}>
        Your love deserves to last{'\n'}forever.
      </Text>

      <Text style={[styles.body, { fontSize: ui.body, lineHeight: ui.bodyLine, marginTop: ui.dividerGapB }]}>
        <Text style={styles.bold}>UsForever</Text> was created to protect, relive, and celebrate the moments that matter
        most.
      </Text>

      <Text style={[styles.sectionTitle, { fontSize: ui.section, marginTop: ui.dividerGapA }]}>Our Story</Text>

      <Text style={[styles.bodyMuted, { fontSize: ui.bodyMuted, lineHeight: ui.mutedLine, marginTop: ui.dividerGapB }]}>
        Your wedding is not just a day — it’s the beginning of something timeless. UsForever was built to ensure that
        your smiles, tears, vows, and celebrations never fade into forgotten folders.{'\n'}
        We believe wedding memories deserve more than storage. They deserve a safe, beautiful space where they can live
        on — year after year.
      </Text>

      <View style={[styles.divider, { marginTop: ui.dividerGapA, marginBottom: ui.dividerGapB }]} />

      <TouchableOpacity
        style={[styles.row, { paddingVertical: ui.rowPadV }]}
        onPress={() => setShowOffer((v) => !v)}
        activeOpacity={0.8}
      >
        <Text style={[styles.rowText, { fontSize: ui.rowText }]} numberOfLines={1}>
          What we Offer
        </Text>

        {showOffer ? (
          <ChevronDownIcon width={ui.chevron} height={ui.chevron} />
        ) : (
          <ChevronRightIcon width={ui.chevron} height={ui.chevron} />
        )}
      </TouchableOpacity>

      {showOffer && (
        <View style={{ paddingLeft: ui.listIndent }}>
          {[
            'Private and secure cloud storage',
            'Intelligent photo organization',
            'Easy family sharing',
            'Smart TV viewing experience',
            'Long-term preservation of your wedding story',
          ].map((txt) => (
            <Text
              key={txt}
              style={{
                color: Colors.textSecondary,
                fontSize: ui.listItem,
                marginTop: ui.listGap,
                lineHeight: ui.bodyLine,
              }}
            >
              • {txt}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.divider, { marginTop: ui.dividerGapB, marginBottom: ui.dividerGapB }]} />

      <Text style={[styles.sectionTitle, { fontSize: ui.section, marginTop: ui.dividerGapB }]}>Our Promise</Text>

      <Text style={[styles.bodyMuted, { fontSize: ui.bodyMuted, lineHeight: ui.mutedLine, marginTop: ui.dividerGapB }]}>
        Some moments are too precious to fade.{'\n'}
        UsForever quietly promises that your love, your vows, and your memories will always have a home.
      </Text>

      <View style={[styles.divider, { marginTop: ui.dividerGapA, marginBottom: ui.dividerGapB }]} />

      <TouchableOpacity
        style={[styles.row, { paddingVertical: ui.rowPadV }]}
        onPress={() => router.push('/privacy')}
        activeOpacity={0.85}
      >
        <Text style={[styles.rowText, { fontSize: ui.rowText }]} numberOfLines={1}>
          Privacy Policy
        </Text>
        <ChevronRightIcon width={ui.chevron} height={ui.chevron} />
      </TouchableOpacity>

      <View style={styles.dividerThin} />

      <TouchableOpacity
        style={[styles.row, { paddingVertical: ui.rowPadV }]}
        onPress={() => router.push('/tc')}
        activeOpacity={0.85}
      >
        <Text style={[styles.rowText, { fontSize: ui.rowText }]} numberOfLines={1}>
          Terms &amp; Conditions
        </Text>
        <ChevronRightIcon width={ui.chevron} height={ui.chevron} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
<View>
  <View
    style={[
      styles.header,
      {
        paddingHorizontal: ui.headerPadH,
        paddingVertical: ui.headerPadV,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.background,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
      },
    ]}
  >
    <TouchableOpacity
      onPress={() => router.back()}
      style={{
        width: ui.backTapW,
        height: ui.backTapW,
        justifyContent: 'center',
        paddingTop: 4,
      }}
      activeOpacity={0.85}
    >
      <BackIcon width={ui.back} height={ui.back} />
    </TouchableOpacity>

    <Text style={[styles.headerTitle, { fontSize: ui.headerTitle, color: Colors.textPrimary }]}>
      About Us
    </Text>

    <View style={{ width: ui.backTapW }} />
  </View>

  <View style={styles.headerBottomShadow} />
</View>

      <View style={styles.bodyWrap}>
        {shouldScroll ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: ui.footerReserve }}>
            {Content}
          </ScrollView>
        ) : (
          <View style={[styles.noScrollWrap, { paddingBottom: ui.footerReserve }]}>{Content}</View>
        )}

        <View style={styles.footerFixed}>
          <ProfileFooterLogo />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },

  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '800' },

  bodyWrap: { flex: 1 },
  noScrollWrap: { flex: 1 },

  container: {},

  hero: { color: Colors.primaryPink, fontWeight: '900' },

  sectionTitle: { color: Colors.primaryPink, fontWeight: '900' },

  body: { color:"#585858",fontWeight:300
 },

  bodyMuted: { color:"#585858",fontWeight:300,
 },

  bold: {
    fontWeight: '700',
    color:"#585858",

    includeFontPadding: false,
  },

  divider: { height: 1, backgroundColor: Colors.border },
  dividerThin: { height: 1, backgroundColor: Colors.border },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rowText: {
    color:"#666263",

    fontWeight: '700',
  },
  

  footerFixed: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});