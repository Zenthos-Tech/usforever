import { Image, StyleSheet, View } from 'react-native';

export default function FixedSidePeeks({ W, peek, gap, prevUri, nextUri, bg }) {
  const full = { position: 'absolute', top: 0, bottom: 0, width: W };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {!!prevUri && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: peek,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: prevUri }}
            resizeMode="contain"
            style={[full, { left: -(W - peek) }]}
          />
        </View>
      )}

      {!!nextUri && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: peek,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: nextUri }}
            resizeMode="contain"
            style={[full, { left: 0 }]}
          />
        </View>
      )}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: peek,
          width: gap,
          backgroundColor: bg,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: peek,
          width: gap,
          backgroundColor: bg,
        }}
      />
    </View>
  );
}
