// components/UsForeverHeader.js
// ✅ SVG instead of PNG
// ✅ No Image component
// ✅ Fully responsive

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/theme/colors';
import { useLayoutTokens } from '@/ui/layout';

/** ✅ SVG */
import HeartIcon from '../assets/images/heart.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function UsForeverHeader({
  align = 'center',
  topGap = 0,
  title = 'us forever',
}) {
  const t = useLayoutTokens();

  const fontSize = useMemo(() => {
    const raw = t.W * 0.07;
    return clamp(raw, t.W * 0.055, t.W * 0.085);
  }, [t.W]);

  const heartSize = useMemo(() => fontSize * 0.7, [fontSize]);

  const marginLeft = useMemo(
    () => clamp(t.v1 * 0.4, t.v1 * 0.3, t.v1 * 0.6),
    [t.v1]
  );

  const containerTopGap = useMemo(() => (topGap ? topGap : 0), [topGap]);

  return (
    <View
      style={[
        styles.wrap,
        {
          alignItems: align === 'center' ? 'center' : 'flex-start',
          marginTop: containerTopGap,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[
            styles.text,
            {
              fontSize,
              color: Colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>

        {/* ✅ SVG instead of Image */}
        <HeartIcon
          width={heartSize}
          height={heartSize}
          style={{
            marginLeft,
            color: Colors.primaryPink, // 👈 works if svg uses currentColor
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
  },
});