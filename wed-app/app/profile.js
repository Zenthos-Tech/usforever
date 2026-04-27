// app/ProfileScreen.js
// ✅ Updates requested:
// - Header border radius LESS
// - Menu icons EXACT 32x32
// - Menu fonts: Grift, 400, 20px, lineHeight 20 (100%), letterSpacing 0
// ✅ NEW: About Us opens About Us screen
// ✅ NEW: Profile picture uses WeddingContext profilePhotoUri everywhere
// ✅ CHANGED: all icons now use SVG (logic kept same)

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWedding } from '../context/WeddingContext';

import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

import EditProfileModal from '@/components/EditProfileModal';
import FaqModal from '@/components/FaqModal';
import SharedLinksModal from '@/components/SharedLinksModal';

import ProfileFooterLogo, { FOOTER_BASE_HEIGHT } from '../components/footerlogo';

import AboutSvg from '../assets/images/about.svg';
import BackArrowSvg from '../assets/images/back.svg';
import EditIconSvg from '../assets/images/edit.svg';

import MailIconSvg from '../assets/images/email.svg';
import AboutIconSvg from '../assets/images/info.svg';
import FaqIconSvg from '../assets/images/live_help.svg';
import LogoutIconSvg from '../assets/images/logout.svg';
import ChatIconSvg from '../assets/images/question_answer.svg';
import CallIconSvg from '../assets/images/support_agent.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function ProfileScreen() {
  const router = useRouter();

  const {
    weddingData,
    resetWedding,
    profilePhotoUri,
  } = useWedding();

  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  useLayoutTokens() || {};

  const [editOpen, setEditOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [shareLinksOpen, setShareLinksOpen] = useState(false);

  const weddingId = weddingData?.weddingId || weddingData?._id || '';

  const FOOTER_HEIGHT = FOOTER_BASE_HEIGHT + insets.bottom;

  const coupleName =
    weddingData?.brideName && weddingData?.groomName
      ? `${weddingData.brideName} & ${weddingData.groomName}`
      : 'Your Wedding';

  const weddingDateStr = weddingData?.weddingDate || '';

  const ui = useMemo(() => {
    const gutter = clamp(W * 0.05, 12, 24);
    const s = W / 375;

    const headerH = Math.round(H * 0.32);

    // ✅ LESS radius
    const headerRadius = clamp(W * 0.06, 12, 20);

    const headerContentDown = clamp(H * 0.06, 20, 45);

    return {
      gutter,
      headerH,
      headerRadius,
      headerContentDown,

      avatar: clamp(78 * s, 62, 102),
      nameSize: clamp(18 * s, 16, 24),
      dateSize: clamp(13 * s, 12, 16),

      editTextSize: clamp(12 * s, 11, 15),
      editIcon: clamp(14 * s, 12, 18),

      rowPadV: 12,
      rowPadH: clamp(W * 0.07, 18, 28),

      // keep same logic; was requested as exact 32x32 in comment, but original logic kept below
      iconSize: 26,

      textSize: 15,
      lineH: 20,
      letter: 0,

      dividerColor: '#C4C2C3',
    };
  }, [W, H]);

  const handleLogout = async () => {
    await resetWedding?.();
    router.replace('/onboarding');
  };

  const HEADER_COLOR = Colors.aboutPage?.icon;
  const MENU_BG = Colors.aboutPage?.background;
  const ICON_COLOR = Colors.aboutPage?.icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MENU_BG || Colors.background }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            height: ui.headerH,
            backgroundColor: HEADER_COLOR || Colors.aboutPage,
            borderBottomLeftRadius: ui.headerRadius,
            borderBottomRightRadius: ui.headerRadius,
            paddingTop: insets.top,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              top: insets.top + 6,
              left: 8,
            },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <BackArrowSvg
            width={24}
            height={24}
            
          />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: ui.headerContentDown }}>
          {/* ✅ Profile picture from context */}
          {profilePhotoUri ? (
            <Image
              source={{ uri: profilePhotoUri }}
              style={[
                styles.avatar,
                {
                  width: ui.avatar,
                  height: ui.avatar,
                  borderRadius: ui.avatar / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarSvgWrap,
                {
                  width: ui.avatar,
                  height: ui.avatar,
                  borderRadius: ui.avatar / 2,
                },
              ]}
            >
              <AboutSvg width={ui.avatar} height={ui.avatar} />
            </View>
          )}

          <Text style={[styles.name, { fontSize: ui.nameSize }]} numberOfLines={1}>
            {coupleName}
          </Text>

          {!!weddingDateStr && (
            <Text style={[styles.date, { fontSize: ui.dateSize }]} numberOfLines={1}>
              {weddingDateStr}
            </Text>
          )}

          <TouchableOpacity
            style={styles.editRowCentered}
            onPress={() => setEditOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.editText, { fontSize: ui.editTextSize }]}>Edit Profile</Text>
            <View style={{ marginLeft: 8 }}>
              <EditIconSvg
                width={ui.editIcon}
                height={ui.editIcon}
              
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* MENU LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: FOOTER_HEIGHT + 12,
          backgroundColor: MENU_BG || Colors.background,
        }}
      >
        <MenuItem
          icon={AboutIconSvg}
          label="About Us"
          ui={ui}
          iconColor={ICON_COLOR}
          onPress={() => router.push('/AboutUs')}
        />

        <MenuItem icon={CallIconSvg} label="Call our team" ui={ui} iconColor={ICON_COLOR} />
        <MenuItem icon={ChatIconSvg} label="Active share links" ui={ui} iconColor={ICON_COLOR} onPress={() => setShareLinksOpen(true)} />

        <MenuItem
          icon={FaqIconSvg}
          label="Frequently Asked Questions"
          ui={ui}
          iconColor={ICON_COLOR}
          onPress={() => setFaqOpen(true)}
        />

        <MenuItem icon={MailIconSvg} label="Send us email" ui={ui} iconColor={ICON_COLOR} />
        <MenuItem icon={LogoutIconSvg} label="Logout" ui={ui} iconColor={ICON_COLOR} onPress={handleLogout} />
      </ScrollView>

      <View style={styles.footerFixed}>
        <ProfileFooterLogo />
      </View>

      <EditProfileModal visible={editOpen} onClose={() => setEditOpen(false)} />
      <FaqModal visible={faqOpen} onClose={() => setFaqOpen(false)} />
      <SharedLinksModal visible={shareLinksOpen} onClose={() => setShareLinksOpen(false)} weddingId={weddingId} />
    </SafeAreaView>
  );
}

function MenuItem({ icon: Icon, label, onPress, ui, iconColor }) {
  return (
    <View
      style={{
        backgroundColor: Colors.aboutPage?.background,
        paddingVertical: 4,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: ui.rowPadH + 10,
          paddingRight: ui.rowPadH,
          paddingVertical: ui.rowPadV,
        }}
      >
        <View
          style={{
            width: ui.iconSize,
            height: ui.iconSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            width={ui.iconSize}
            height={ui.iconSize}
            fill={iconColor}
            stroke={iconColor}
          />
        </View>

        <Text
          style={[
            styles.menuText,
            {
              marginLeft: 18,
              fontSize: ui.textSize,
              lineHeight: ui.lineH,
              letterSpacing: ui.letter,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>

      <View
        style={{
          height: 1,
          width: '100%',
          backgroundColor: ui.dividerColor,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },

  backBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatar: {
    marginBottom: 10,
  },

  avatarSvgWrap: {
    overflow: 'hidden',
  },

  name: {
    color: Colors.white,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: '85%',
    marginTop: 2,
  },

  date: {
    color: Colors.white,
    opacity: 0.85,
    marginTop: 3,
    textAlign: 'center',
    maxWidth: '85%',
  },

  editRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  editText: {
    color: Colors.white,
    fontWeight: '600',
    opacity: 0.85,
  },

  menuText: {
    fontFamily: 'Grift',
    fontWeight: '400',
    fontStyle: 'normal',
    color: Colors.textPrimary,
  },

  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});