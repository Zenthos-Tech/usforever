import { Animated, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FolderIcon from '../assets/images/folder.svg';
import VisibleIcon2 from '../assets/images/locks.svg';

export function FolderTile({
  folder,
  itemW,
  ml,
  mt,
  circleSize,
  iconSize,
  badgeSize,
  selectedCount,
  onPress,
  onOpenActions,
  enableLongPress,
  theme,
  activeScale,
}) {
  const isSelectedFolder =
    folder?.kind === 'selected' || String(folder?.id) === 'selected_folder';
  const showLock = isSelectedFolder;

  const badgeOffset = Math.max(6, Math.round(circleSize * 0.08));
  const scaleStyle = activeScale ? { transform: [{ scale: activeScale }] } : null;

  return (
    <Pressable
      style={[styles.folderItem, { width: itemW, marginLeft: ml, marginTop: mt }]}
      onPress={onPress}
      onLongPress={(e) => {
        if (!enableLongPress) return;

        const ne = e?.nativeEvent || {};
        const tileLeft = (ne.pageX ?? 0) - (ne.locationX ?? 0);
        const tileTop = (ne.pageY ?? 0) - (ne.locationY ?? 0);

        onOpenActions?.({
          folder,
          x: tileLeft,
          y: tileTop,
          w: circleSize,
          h: circleSize,
        });
      }}
      delayLongPress={220}
    >
      <Animated.View
        style={[{ width: circleSize, height: circleSize, position: 'relative' }, scaleStyle]}
      >
        <View
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: theme?.cSurface,
              overflow: 'hidden',
              borderWidth: 0,
              borderColor: 'transparent',
            },
          ]}
        >
          {folder.coverUrl ? (
            <Image
              source={{ uri: folder.coverUrl }}
              style={{ width: circleSize, height: circleSize }}
              resizeMode="cover"
            />
          ) : (
            <FolderIcon width={iconSize} height={iconSize} />
          )}
        </View>

        {showLock ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: badgeOffset,
              top: badgeOffset,
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: theme?.cPrimary,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              elevation: 9999,
            }}
          >
            <VisibleIcon2 width={badgeSize * 0.62} height={badgeSize * 0.62} />
          </View>
        ) : null}
      </Animated.View>

      <Text style={[styles.folderText, { color: theme?.cMuted }]}>
        {folder.name}
        {isSelectedFolder ? ` (${selectedCount})` : ''}
      </Text>
    </Pressable>
  );
}

export function HoldAction({ Icon, label, onPress, color }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.holdAction}>
      <Icon width={17} height={17} color={color} style={{ marginBottom: 2 }} />
      <Text style={{ fontSize: 10, fontWeight: '900', color, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  folderItem: { alignItems: 'center' },
  circle: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  folderText: { marginTop: 8, fontSize: 12, textAlign: 'center' },
  holdAction: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
});
