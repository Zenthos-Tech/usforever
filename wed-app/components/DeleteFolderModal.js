import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function hexToRgba(hex, alpha) {
  const h = String(hex || '').replace('#', '').trim();
  if (!(h.length === 3 || h.length === 6)) return undefined;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function DeleteFolderModal({
  visible,
  onCancel,
  onConfirm,
  isSelectedFolder,
  gutter,
  overlaySoft,
  cBg,
  cPrimary,
  cBorder,
  cText,
  cMuted,
  cDangerSoft,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onCancel}
    >
      <View style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: overlaySoft }]}
          onPress={onCancel}
        />

        <View style={[styles.popupCenter, { paddingHorizontal: gutter }]}>
          <View
            style={[
              styles.popupCard,
              {
                backgroundColor: cBg,
                borderColor: hexToRgba(cPrimary, 0.35) ?? cBorder,
              },
            ]}
          >
            <View style={[styles.popupTopAccent, { backgroundColor: cPrimary }]} />

            <Text style={[styles.popupTitle, { color: cText }]}>Delete folder?</Text>

            <Text style={[styles.popupDesc, { color: cMuted }]}>
              {isSelectedFolder
                ? 'This will hide the Selected folder tile.'
                : 'This will be permanently remove from your album list.'}
            </Text>

            <View style={styles.popupRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onCancel}
                style={[
                  styles.popupBtn,
                  {
                    borderColor: cPrimary,
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                <Text style={{ color: cPrimary, fontWeight: '900' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onConfirm}
                style={[
                  styles.popupBtn,
                  {
                    borderColor: cPrimary,
                    backgroundColor: cPrimary,
                  },
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>Delete</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.popupSoftBase, { backgroundColor: cDangerSoft }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  popupCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 24,
  },
  popupTopAccent: { height: 5, width: '100%' },
  popupTitle: {
    paddingTop: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '900',
  },
  popupDesc: {
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  popupRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  popupBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupSoftBase: {
    height: 10,
    width: '100%',
  },
});
