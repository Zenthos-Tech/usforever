import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function PreviewBottomAction({
  Icon,
  label,
  onPress,
  iconSize,
  colors,
  boxW,
  boxH,
}) {
  const textSize = clamp(iconSize * 0.42, 10, 12);

  return (
    <TouchableOpacity
      style={[styles.actionBtn, { width: boxW, height: boxH }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Icon width={iconSize} height={iconSize} fill={colors?.icon} />
      <Text style={[styles.actionText, { color: colors?.text, fontSize: textSize }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actionText: { marginTop: 2, fontWeight: '700' },
});
