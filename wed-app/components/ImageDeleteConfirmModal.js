import { BlurView } from 'expo-blur';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '../theme/colors';

const themePrimary = () => Colors?.primary ?? Colors?.primaryPink ?? '#E85A70';

export default function ImageDeleteConfirmModal({
  visible,
  onCancel,
  onConfirm,
  width,
  cText,
  cMuted,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={onCancel}
      >
        <Pressable
          onPress={() => {}}
          style={[
            styles.confirmCard,
            {
              width,
              borderRadius: 18,
              backgroundColor: Colors?.background ?? '#fff',
            },
          ]}
        >
          <BlurView tint="light" intensity={28} style={StyleSheet.absoluteFill} />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFFC4' }]}
          />

          <Text style={[styles.confirmTitle, { color: cText }]}>Delete Image</Text>
          <Text style={[styles.confirmBody, { color: cMuted }]}>
            Are you sure you want to delete this image?
          </Text>

          <View style={styles.confirmRow}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.85} style={styles.confirmBtn}>
              <Text style={[styles.confirmBtnText, { color: themePrimary() }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={styles.confirmBtn}>
              <Text style={[styles.confirmBtnText, { color: themePrimary() }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  confirmCard: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  confirmTitle: { fontWeight: '900', fontSize: 16 },
  confirmBody: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  confirmRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  confirmBtnText: { fontWeight: '900', fontSize: 14 },
});
