// components/NumericKeypad.js
import Colors from "@/theme/colors";
import { useLayoutTokens } from "@/ui/layout";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Delete from "../assets/images/remove2.svg";

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function NumericKeypad({
  onDigit,
  onBackspace,
  disabled = false,
  backIcon, // ✅ NEW PROP
}) {
  const t = useLayoutTokens();
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };

  const gapX = useMemo(() => clamp(t.W * 0.03, 10, 16), [t.W]);

  // ✅ vertical gap between rows
  const gapY = 4;

  const keypadW = useMemo(() => {
    const usable = Math.min(box.w || 0, t.contentMaxW);
    return usable || 0;
  }, [box.w, t.contentMaxW]);

  const keyW = useMemo(() => {
    if (!keypadW) return 0;
    return (keypadW - gapX * 2) / 3;
  }, [keypadW, gapX]);

  const keyH = useMemo(() => {
    if (!keyW) return 0;
    return clamp(keyW * 0.53, 30, 65);
  }, [keyW]);

  const fontSize = useMemo(() => clamp(keyH * 0.42, 20, 30), [keyH]);
  const radius = useMemo(() => clamp(keyW * 0.14, 10, 14), [keyW]);

  const backIconSize = useMemo(() => clamp(keyH * 0.55, 22, 32), [keyH]);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <View style={[styles.rowsWrap, keypadW ? { width: keypadW } : null]}>
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
        ].map((row, rIndex) => (
          <View
            style={[styles.row, { marginBottom: gapY }]} // ✅ gap under EVERY row
            key={rIndex}
          >
            {row.map((digit, i) => (
              <Digit
                key={digit}
                label={digit}
                keyW={keyW}
                keyH={keyH}
                radius={radius}
                fontSize={fontSize}
                disabled={disabled}
                isLast={i === 2}
                onPress={() => onDigit(digit)}
              />
            ))}
          </View>
        ))}

        {/* Last row */}
        <View style={[styles.row, { marginTop: 0 }]}>
          <View style={{ width: keyW, height: keyH, marginRight: gapX }} />

          <Digit
            label="0"
            keyW={keyW}
            keyH={keyH}
            radius={radius}
            fontSize={fontSize}
            disabled={disabled}
            isLast
            onPress={() => onDigit("0")}
          />

          <Pressable
            disabled={disabled}
            onPress={onBackspace}
            style={({ pressed }) => [
              styles.backspace,
              {
                width: keyW,
                height: keyH,
                marginLeft: gapX,
                opacity: pressed && !disabled ? 0.7 : 1,
              },
            ]}
          >
            {backIcon ? (
              <View
                style={{
                  width: backIconSize,
                  height: backIconSize,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Delete
                  width={backIconSize}
                  height={backIconSize}
                  preserveAspectRatio="xMidYMid meet"
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.backspaceText,
                  { fontSize: clamp(fontSize * 0.9, 18, 26) },
                ]}
              >
                ⌫
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  function Digit({
    label,
    onPress,
    keyW,
    keyH,
    radius,
    fontSize,
    disabled,
    isLast,
  }) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.key,
          {
            width: keyW,
            height: keyH,
            borderRadius: radius,
            marginRight: isLast ? 0 : gapX,
            opacity: pressed && !disabled ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.keyText, { fontSize }]}>{label}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  fill: { width: "100%" },
  rowsWrap: { alignSelf: "center" },
  row: { flexDirection: "row" },
  key: {
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  backspace: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  backspaceText: {
    color: Colors.textPrimary,
    fontWeight: "500",
  },
});
