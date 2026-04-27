// components/ErrorModal.js

import Colors from "@/theme/colors";
import { useLayoutTokens } from "@/ui/layout";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function ErrorModal({ visible, message, onClose }) {
  const t = useLayoutTokens() || {};
  const W = Number.isFinite(t.W) ? t.W : 390;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { width: Math.round(W * 0.82), borderRadius: 18 },
          ]}
        >
          <Text style={styles.message}>{message}</Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: Colors.primaryPink,
                borderRadius: 12,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.btnText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },
  btn: {
    width: "100%",
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
