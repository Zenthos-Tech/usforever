import { useMemo, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function ZoomableImage({ uri, imgRadius, imageBg, onZoomChange }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  const allGestures = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
      })
      .onEnd(() => {
        if (scale.value < 1.05) {
          scale.value = withSpring(1);
          savedScale.value = 1;
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          runOnJS(onZoomChangeRef.current)(false);
        } else {
          savedScale.value = scale.value;
          runOnJS(onZoomChangeRef.current)(true);
        }
      });

    const pan = Gesture.Pan()
      .averageTouches(true)
      .minPointers(2)
      .onUpdate((e) => {
        if (savedScale.value > 1) {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        }
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(onZoomChangeRef.current)(false);
      });

    return Gesture.Simultaneous(Gesture.Simultaneous(pinch, pan), doubleTap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={allGestures}>
      <View style={[styles.imageClip, { borderRadius: imgRadius, backgroundColor: imageBg }]}>
        <Reanimated.View style={[StyleSheet.absoluteFill, animStyle]}>
          <Image
            source={uri ? { uri } : undefined}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </Reanimated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  imageClip: { flex: 1, overflow: 'hidden' },
});
