import PrimaryButton from '@/components/PrimaryButton';
import ProfileFooterLogo, { FOOTER_BASE_HEIGHT } from '@/components/footerlogo';
import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import BackIcon from '../assets/images/Back icon.svg';
import { default as ChevronDownIcon, default as ChevronRightIcon } from '../assets/images/downicon.svg';
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const hexToRgba = (hex, alpha = 1) => {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function FaqModal({ visible, onClose, onSendMail, faqs = [] }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const t = useLayoutTokens() || {};
  const [openIndex, setOpenIndex] = useState(-1);

  const ui = useMemo(() => {
    const gutter = clamp((t?.gutter ?? t?.pad ?? W * 0.05) || W * 0.05, 12, 24);
    const s = W / 375;

    const pad = clamp(gutter * 0.95, 14, 22);

    const topTitle = clamp(16 * s, 14, 18);
    const hero = clamp(24 * s, 18, 28);
    const heroLine = clamp(hero * 1.15, 26, 40);

    const body = clamp(13 * s, 12, 15);
    const bodyLine = clamp(body * 1.4, 18, 24);

    const section = clamp(18 * s, 16, 22);

    const q = clamp(14 * s, 13, 16);
    const a = clamp(12 * s, 11, 14);
    const bullet = clamp(a * 1.2, 12, 16);
const rowV = clamp(gutter * 0.6, 8, 12);  // ✅ tighter rows
    const icon = clamp(18 * s, 16, 22);

    const btnH = clamp(54 * s, 48, 62);

    const backTap = clamp(44 * s, 40, 54);

    // ✅ sheet top inset — match AboutUs (just safe area, no extra offset)
    const sheetTopInset = insets.top;

    // ✅ header padding — match AboutUs headerPadV
    const topPad = clamp(gutter * 0.6, 10, 18);
const topBottom = clamp(gutter * 0.4, 6, 12); // ✅ smaller = divider moves UP

    const gap = clamp(gutter * 0.75, 10, 18);
    const bulletGap = clamp(gutter * 0.5, 8, 14);

    const stuckTop = clamp(gutter * 1.1, 16, 28);
    const stuckBottom = clamp(gutter * 0.7, 10, 18);
    const stuckSize = clamp(q, 14, 16);

    const dividerH = 1;
    const overlayAlpha = 0.35;

    // ✅ footer — small nudge so it sits near the bottom without going off-screen
    const footerNudge = clamp(gutter * 0.5, 6, 14);

    const footerPad = FOOTER_BASE_HEIGHT + insets.bottom;
    const scrollBottom = footerPad + clamp(gutter * 0.9, 12, 24);

    // ✅ header title down
    const headerTitleDown = clamp(gutter * 0.7, 10, 18);

    return {
      gutter,
      pad,
      topTitle,
      hero,
      heroLine,
      body,
      bodyLine,
      section,
      q,
      a,
      bullet,
      rowV,
      icon,
      btnH,
      backTap,
      topPad,
      topBottom,
      gap,
      bulletGap,
      stuckTop,
      stuckBottom,
      stuckSize,
      dividerH,
      overlayAlpha,
      footerNudge,
      footerPad,
      scrollBottom,
      sheetTopInset,
      headerTitleDown,
    };
  }, [t, W, H, insets.bottom]);

  const data =
    faqs.length > 0
      ? faqs
      : [
          {
            q: 'How safe are our wedding memories?',
            a: [
              'Private and secure cloud storage',
              'Intelligent photo organization',
              'Easy family sharing',
              'Smart TV viewing experience',
              'Long-term preservation of your wedding story',
            ],
          },
          {
            q: 'Can we share our album with family?',
            a: ['Invite-only sharing via link/QR', 'Control who can view and upload'],
          },
          { q: 'How does facial recognition work?', a: ['We group similar faces to help you find photos faster'] },
          {
            q: 'Can we watch our wedding on TV?',
            a: ['Use “Connect to TV” with code / QR', 'Play your album as a slideshow on Smart TV'],
          },
          {
            q: 'Will our memories stay safe for years?',
            a: ['Redundant backups and secure storage', 'You can export/download anytime'],
          },
        ];

  // ✅ Scroll only after a chevron is pressed
  const scrollEnabled = openIndex !== -1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: hexToRgba(Colors.black, ui.overlayAlpha) }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: Colors.background,
              paddingHorizontal: ui.pad,
              paddingBottom: ui.footerPad,
              paddingTop: ui.sheetTopInset,
            },
          ]}
          onPress={() => {}}
        >
          {/* HEADER */}
          <View style={[styles.topBar, { paddingTop: ui.topPad, paddingBottom: ui.topBottom }]}>
          <TouchableOpacity
  onPress={onClose}
  activeOpacity={0.85}
  style={[
    styles.topIconBtn,
    {
      width: ui.backTap,
      height: ui.backTap,
    },
  ]}
><BackIcon width={ui.icon} height={ui.icon} />
            </TouchableOpacity>

            <View style={styles.topTitleWrap}>
              <Text style={[styles.topTitle, { fontSize: ui.topTitle, color: Colors.textPrimary }]} numberOfLines={2}>
                Frequently Asked Questions
              </Text>
            </View>

            <View style={{ width: ui.backTap }} />
          </View>

          {/* FULL-WIDTH divider (header divider) */}
          <View
            style={{
              height: ui.dividerH,
              backgroundColor: Colors.border,
              marginHorizontal: -ui.pad,
              marginBottom: ui.gap * 0.55,
            }}
          />

          {/* BODY */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: ui.scrollBottom }}
            scrollEnabled={scrollEnabled}
          >
            <Text style={[styles.hero, { fontSize: ui.hero, lineHeight: ui.heroLine, color: Colors.primaryPink }]}>
              We’re here to help you with{'\n'}anything and everything on{'\n'}UsForever
            </Text>

            <Text
              style={[
                styles.sub,
                {
                  fontSize: ui.body,
                  lineHeight: ui.bodyLine,
                  color: "#666263",

                 marginTop: ui.gap * 0.4   // ✅ moves it UP
                },
              ]}
            >
              At <Text style={[styles.bold, { color: Colors.textPrimary }]}>UsForever</Text> we expect at a day’s start is
              you, better and happier than yesterday. We have got you covered share your concern or check our frequently
              asked questions listed below.
            </Text>

            {/* ✅ FAQ title LEFT + divider below aligned with same padding */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: ui.hero,
                  color: Colors.primaryPink,
                  marginTop: ui.gap * 1.25,
                  textAlign: 'left',
                  alignSelf: 'flex-start',
                },
              ]}
            >
              FAQ
            </Text>

        <View
  style={{
    height: 1,
    width: '100%',
    backgroundColor: Colors.border,
    marginTop: ui.gap * 0.25,     // ✅ less space above
    marginBottom: ui.gap * 0.25,  // ✅ less space below (brings “How safe…” up)
  }}
/>

            <View style={styles.list}>
              {data.map((item, idx) => {
                const open = idx === openIndex;
                return (
                  <View key={`${idx}_${item.q}`}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.row, { paddingVertical: ui.rowV, columnGap: ui.gap }]}
                      onPress={() => setOpenIndex(open ? -1 : idx)}
                    >
                      <Text style={[styles.q, { fontSize: ui.q, color: Colors.textPrimary }]}>{item.q}</Text>
                <View style={{ opacity: 0.9 }}>
  {open ? (
    <ChevronDownIcon width={ui.icon} height={ui.icon} />
  ) : (
    <ChevronRightIcon width={ui.icon} height={ui.icon} />
  )}
</View>
                    </TouchableOpacity>

                    {open && (
                      <View
                        style={[
                          styles.answer,
                          {
                            paddingBottom: ui.gap * 0.7,
                            paddingLeft: clamp(ui.gutter * 0.15, 2, 8),
                          },
                        ]}
                      >
                        {item.a.map((line, i) => (
                          <View
                            key={`${idx}_${i}`}
                            style={[styles.bulletRow, { columnGap: ui.bulletGap, marginTop: ui.gap * 0.4 }]}
                          >
                            <Text
                              style={[
                                styles.bullet,
                                { fontSize: ui.bullet, color: Colors.textSecondary, opacity: 0.75 },
                              ]}
                            >
                              •
                            </Text>
                            <Text
                              style={[
                                styles.aText,
                                { fontSize: ui.a, color: "#666263"
, lineHeight: ui.bodyLine,fontWEight:400 },
                              ]}
                            >
                              {line}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={[styles.divider, { height: ui.dividerH, backgroundColor: Colors.border }]} />
                  </View>
                );
              })}
            </View>

            <Text
              style={[
                styles.stuck,
                {
                  marginTop: ui.stuckTop,
                  marginBottom: ui.stuckBottom,
                  fontSize: ui.stuckSize,
                  color: Colors.textPrimary,
                },
              ]}
            >
              Still stuck? Help us a mail away
            </Text>

            <PrimaryButton title="SEND US A MAIL" onPress={onSendMail} height={ui.btnH} />
          </ScrollView>

          {/* FOOTER LOGO */}
          <View style={styles.footerWrap}>
            <ProfileFooterLogo />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },

  sheet: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  topIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  topTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },

  topTitle: { fontWeight: '800', textAlign: 'center' },

  hero: { fontWeight: '800' },

  sub: {},

  bold: { fontWeight: '600' },

  sectionTitle: {
    fontWeight: '900',
  },

  list: {},

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  q: { flex: 1, fontWeight: '400' },

  answer: {},

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bullet: {},

  aText: { flex: 1 },

  divider: {},

  stuck: {
    textAlign: 'center',
    fontWeight: '800',
  },

  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});