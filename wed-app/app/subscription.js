// app/subscription.js
// ✅ Footer fixed
// ✅ Card fills middle
// ✅ No shadow
// ✅ Clean like screenshot
// ✅ Replaced image/emoji-style icons with SVG assets

import PrimaryButton from '@/components/PrimaryButton';
import UsForeverHeader from '@/components/UsForeverHeader';
import Colors from '@/theme/colors';
import { Typography } from '@/theme/text';
import { useLayoutTokens } from '@/ui/layout';

import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** ✅ SVG icons */
import FamilyFriendsIcon from '../assets/images/f&f.svg';
import FacialIcon from '../assets/images/facial.svg';
import GalleryIcon from '../assets/images/gallery.svg';
import StorageIcon from '../assets/images/storage.svg';
import TvIcon from '../assets/images/tv.svg';
import WebIcon from '../assets/images/web.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useLayoutTokens();
  const gutter = t.gutter;

  const features = [
    { Icon: FacialIcon, text: 'Facial recognition' },
    { Icon: FamilyFriendsIcon, text: 'Family & Friends sharing' },
    { Icon: WebIcon, text: 'Web app access' },
    { Icon: TvIcon, text: 'Smart TV app access' },
    { Icon: GalleryIcon, text: 'High-quality photo viewing' },
  ];

  const titleSize = clamp(t.W * 0.075, t.W * 0.065, t.W * 0.09);
  const subtitleSize = clamp(t.W * 0.04, t.W * 0.034, t.W * 0.048);
  const featureSize = clamp(t.W * 0.044, t.W * 0.038, t.W * 0.052);
  const priceSize = clamp(t.W * 0.066, t.W * 0.058, t.W * 0.08);
  const iconSize = clamp(t.W * 0.048, t.W * 0.04, t.W * 0.058);

  const spacing = clamp(t.v2 * 0.9, t.v2 * 0.7, t.v2 * 1.2);
  const btnH = clamp(t.H * 0.06, t.H * 0.052, t.H * 0.07);

  const boxRadius = clamp(t.short * 0.04, t.short * 0.03, t.short * 0.05);
  const padX = clamp(spacing * 0.7, spacing * 0.55, spacing * 0.85);
  const padY = clamp(spacing * 0.9, spacing * 0.75, spacing * 1.1);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: insets.top,
        paddingHorizontal: gutter,
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={{ alignItems: 'center', marginTop: spacing }}>
        <UsForeverHeader />

        <View style={{ marginTop: spacing, alignItems: 'center' }}>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            Unlock your forever?
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                fontSize: subtitleSize,
                marginTop: spacing * 0.5,
                paddingHorizontal: gutter * 0.6,
                color:' #2D2A2B',


              },
            ]}
          >
            Unlock the full experience and keep your wedding moments forever.
          </Text>
        </View>
      </View>

      {/* ✅ LIGHT BORDER BOX */}
      <View style={{ flex: 1, marginTop: spacing }}>
        <View
          style={{
            borderRadius: boxRadius,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.08)',
            backgroundColor: Colors.white,
            paddingHorizontal: padX,
           paddingTop: padY,
paddingBottom: padY * 1.6,
            alignSelf: 'stretch',
          }}
        >
         <Text
  style={[
    styles.planTitle,
    {
      fontSize: featureSize * 1.5,
      marginTop: spacing * 0.8, // 👈 pushes it down
    },
  ]}
>
  Forever Album
</Text>

          {/* STORAGE ROW WITH SVG ICON */}
          <View style={{ alignItems: 'center', marginTop: spacing * 0.8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <StorageIcon
                width={iconSize * 0.95}
                height={iconSize * 0.95}
                style={{ marginRight: spacing * 0.35 }}
              />
              <Text style={{ fontSize: featureSize * 0.9, color: Colors.textSecondary }}>
                300 GB Storage
              </Text>
            </View>
          </View>

          {/* DIVIDER */}
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: Colors.border,
              marginVertical: spacing,
            }}
          />

          {/* FEATURES */}
          {features.map((item, idx) => {
            const IconComp = item.Icon;

            return (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: spacing * 0.9,
                }}
              >
                <IconComp
                  width={iconSize}
                  height={iconSize}
                  style={{ marginRight: spacing * 0.6 }}
                />

                <Text
                  style={{
                    fontSize: featureSize,
                    lineHeight: featureSize * 1.8,
                    color: Colors.black,
                    flexShrink: 1,
                  }}
                >
                  {item.text}
                </Text>
              </View>
            );
          })}

          {/* PRICE */}
          <View style={{ marginTop: spacing * 2.5, alignItems: 'center' }}>
            <Text style={[styles.price, { fontSize: priceSize }]}>₹XXXX / year</Text>
            <Text style={{ marginTop: spacing * 0.4, color: Colors.textSecondary }}>
              Cancel anytime
            </Text>
          </View>
<View style={{ marginTop: spacing * 2, alignItems: 'center' }}>
  <View
    style={{
      width: '100%',
      paddingHorizontal: spacing * 0.1,
    }}
  >
    <PrimaryButton
      title="GET STARTED"
      onPress={() => router.push('/PaymentScreen')}
      height={btnH}
      style={{ width: '100%' }} // 👈 ensure it respects padding container
    />
  </View>

            <TouchableOpacity
              onPress={() => router.replace('/home')}
              style={{ marginTop: spacing * 1.5, alignItems: 'center' }}
              activeOpacity={0.8}
            >
              <Text style={{ textDecorationLine: 'underline', color: Colors.textSecondary }}>
                I’ll pass this time
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: Typography.primaryBodyLight.fontWeight,
    color: Typography.primaryBodyLight.color,
    textAlign: 'center',
  },
  planTitle: {
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.primaryPink,
  },
  price: {
    fontWeight: '900',
    color: Colors.textPrimary,
  },
});