import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '../theme/colors';

import DownloadIcon from '../assets/images/download.svg';
import EditIcon from '../assets/images/edit2.svg';
import ShareIcon from '../assets/images/Share.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

function SvgActionIcon({ Icon, size }) {
  return <Icon width={size} height={size} />;
}

export default function FaceResultPreviewModal({
  visible,
  photos,
  initialIndex,
  onClose,
  onShare,
  onEdit,
  onDownload,
}) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  // Suppress unused-warning for titleSize (kept for parity with prior layout).
  void useMemo(() => clamp(W * 0.044, 16, 18), [W]);
  const bottomBarH = useMemo(() => clamp(H * 0.105, 76, 92), [H]);

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex || 0);

    const t = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: initialIndex || 0,
          animated: false,
        });
      } catch {}
    }, 60);

    return () => clearTimeout(t);
  }, [visible, initialIndex]);

  const currentPhoto = photos[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: Colors?.background ?? '#fff' }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top > 0 ? 6 : 12,
              paddingHorizontal: 16,
            },
          ]}
        />

        <FlatList
          ref={flatListRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => String(item?.id ?? item?.uri ?? index)}
          onMomentumScrollEnd={(e) => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / W);
            setCurrentIndex(nextIndex);
          }}
          getItemLayout={(_, index) => ({
            length: W,
            offset: W * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={{ width: W, flex: 1, paddingHorizontal: 10, paddingVertical: 8 }}>
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: item?.uri }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}
        />
        <View
          style={[
            styles.bottomBar,
            {
              height: bottomBarH + insets.bottom,
              paddingBottom: insets.bottom,
              backgroundColor: Colors?.white ?? '#fff',
              borderTopColor: Colors?.border ?? '#E9E9E9',
            },
          ]}
        >
          <View style={styles.bottomRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bottomItem}
              onPress={() => currentPhoto && onShare?.(currentPhoto)}
            >
              <SvgActionIcon Icon={ShareIcon} size={clamp(W * 0.07, 22, 28)} />
              <Text style={[styles.bottomText, { color: Colors?.textSecondary ?? '#666' }]}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bottomItem}
              onPress={() => currentPhoto && onEdit?.(currentPhoto, currentIndex)}
            >
              <SvgActionIcon Icon={EditIcon} size={clamp(W * 0.07, 22, 28)} />
              <Text style={[styles.bottomText, { color: Colors?.textSecondary ?? '#666' }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bottomItem}
              onPress={() => currentPhoto && onDownload?.(currentPhoto)}
            >
              <SvgActionIcon Icon={DownloadIcon} size={clamp(W * 0.07, 22, 28)} />
              <Text style={[styles.bottomText, { color: Colors?.textSecondary ?? '#666' }]}>
                Download
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  imageWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F6F6F6',
  },
  fullImage: { width: '100%', height: '100%' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 18,
    flex: 1,
  },
  bottomItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
  },
  bottomText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
  },
});
