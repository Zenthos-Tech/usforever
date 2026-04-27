import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLayoutTokens } from './layout';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export default function Screen({
  children,
  style,
  backgroundColor = '#FFFFFF',
  edges = ['top', 'bottom'],
}: Props) {
  const t = useLayoutTokens();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      {/* Outer padding like screenshot */}
      <View style={[styles.outer, { paddingHorizontal: t.gutter }]}>
        {/* Centered fixed max width like screenshot */}
        <View style={[styles.inner, { maxWidth: t.contentMaxW }, style]}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  outer: { flex: 1, alignItems: 'center' },
  inner: { width: '100%' },
});
