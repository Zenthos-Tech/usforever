import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO = require('../assets/images/logo-title.png');

// 👇 single source of truth for footer size
export const FOOTER_BASE_HEIGHT = 28;

export default function ProfileFooterLogo({ containerStyle, imageStyle }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: FOOTER_BASE_HEIGHT,
          paddingBottom: insets.bottom, // ✅ notch / home-indicator safe
        },
        containerStyle,
      ]}
    >
      <Image
        source={LOGO}
        style={[styles.logo, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF', // keeps footer clean when fixed
  },
  logo: {
    height: 18,
  },
});
