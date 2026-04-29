import PrimaryButton from '@/components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ConnectionSuccessModal from './ConnectionSuccessModal';

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../utils/api';
import { getAuthToken } from '../utils/authToken';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

async function confirmPairing(pairingId, weddingId) {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/tv/pair/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ pairingId, weddingId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to confirm pairing');
  return json;
}

function extractPairingId(raw) {
  if (!raw) return null;
  try {
    // Handle deep link: APP_SCHEME://tv/pair?pairingId=...
    const match = raw.match(/[?&]pairingId=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch (_) {}
  // Fallback: treat raw value as pairingId directly
  return raw.trim();
}

export default function ConnectToTVModal({
  visible,
  onClose,
  onConnected,
  weddingId,
}) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const scannedRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activePairingId, setActivePairingId] = useState(null);

  const [showCode, setShowCode] = useState(false);

  const SHEET_H = useMemo(() => clamp(H * 0.80, 480, 640), [H]);
  const PAD_H = useMemo(() => clamp(W * 0.06, 18, 26), [W]);
  const QR_BOX = useMemo(() => clamp(W * 0.72, 260, 340), [W]);
  const CORNER = useMemo(() => clamp(QR_BOX * 0.13, 28, 44), [QR_BOX]);
  const OUT = 14;

  const resetLocalState = () => {
    scannedRef.current = false;
    setCameraReady(false);
    setConfirming(false);
    setShowCode(false);
  };

  const closeAll = useCallback(() => {
    resetLocalState();
    setShowCode(false);
    onClose?.();
  }, [onClose]);

  const handleBarcode = useCallback(
    async ({ data }) => {
      if (!data || scannedRef.current || confirming) return;
      scannedRef.current = true;

      const pairingId = extractPairingId(data);
      if (!pairingId) {
        scannedRef.current = false;
        Alert.alert('Invalid QR', 'This QR code is not a valid TV pairing code.');
        return;
      }

      if (!weddingId) {
        scannedRef.current = false;
        Alert.alert('Error', 'Wedding not loaded. Please try again.');
        return;
      }

      setConfirming(true);
      try {
        const result = await confirmPairing(pairingId, weddingId);
        const resolvedId = result.pairingId || pairingId;
        resetLocalState();
        setActivePairingId(resolvedId);
        setShowSuccess(true);
        onConnected?.(resolvedId);
      } catch (err) {
        scannedRef.current = false;
        setConfirming(false);
        Alert.alert('Connection Failed', err.message || 'Could not connect to TV.');
      }
    },
    [weddingId, confirming, closeAll, onConnected]
  );

  const openCodeModal = useCallback(() => {
    onClose?.();
    setTimeout(() => setShowCode(true), 60);
  }, [onClose]);

  const renderCamera = () => {
    if (!permission) {
      return (
        <View style={[styles.qrInner, styles.center]}>
          <Text style={styles.camText}>Loading camera…</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[styles.qrInner, styles.center, { paddingHorizontal: 18 }]}>
          <Ionicons name="camera-outline" size={40} color="#fff" />
          <Text style={[styles.camText, { marginTop: 12, fontSize: 13 }]}>
            Camera permission is required
          </Text>
          <PrimaryButton
            title="Allow Camera"
            onPress={requestPermission}
            style={{ marginTop: 16, width: QR_BOX - 36, alignSelf: 'center' }}
          />
        </View>
      );
    }

    return (
      <View style={styles.qrInner}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          onBarcodeScanned={confirming ? undefined : handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {!cameraReady && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text style={styles.camText}>Starting camera…</Text>
          </View>
        )}

        {confirming ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <ActivityIndicator size="large" color="#FF5A7A" />
            <Text style={[styles.camText, { marginTop: 10 }]}>Connecting…</Text>
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
            <Ionicons name="scan-outline" size={54} color="rgba(255,255,255,0.85)" />
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeAll}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAll} />

          <View
            style={[
              styles.sheet,
              { height: SHEET_H, paddingBottom: Math.max(24, insets.bottom + 16) },
            ]}
          >
            {/* HEADER */}
            <View style={[styles.header, { paddingHorizontal: PAD_H }]}>
              <Text style={styles.headerTitle}>Connect to TV</Text>
              <Pressable onPress={closeAll} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#111" />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={[styles.content, { paddingHorizontal: PAD_H }]}>
              {/* QR frame */}
              <View style={[styles.qrWrap, { width: QR_BOX, height: QR_BOX * 1.1 }]}>
                {renderCamera()}

                {/* Corner brackets */}
                <View style={[styles.corner, { width: CORNER, height: CORNER, left: -OUT, top: -OUT, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 }]} />
                <View style={[styles.corner, { width: CORNER, height: CORNER, right: -OUT, top: -OUT, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 }]} />
                <View style={[styles.corner, { width: CORNER, height: CORNER, left: -OUT, bottom: -OUT, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 }]} />
                <View style={[styles.corner, { width: CORNER, height: CORNER, right: -OUT, bottom: -OUT, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 }]} />
              </View>

              <Text style={styles.title}>Scan the QR code{'\n'}shown on your TV</Text>
              <Text style={styles.sub}>Position the QR code within the frame</Text>

              <View style={{ flex: 1 }} />

              <PrimaryButton
                title="Or connect using code"
                onPress={openCodeModal}
                height={48}
                style={styles.footerBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      <EnterTvCodeModal
        visible={showCode}
        weddingId={weddingId}
        onClose={() => setShowCode(false)}
        onConnected={(pid) => {
          setShowCode(false);
          setActivePairingId(pid);
          setShowSuccess(true);
          onConnected?.(pid);
        }}
      />

      <ConnectionSuccessModal
        visible={showSuccess}
        pairingId={activePairingId}
        onClose={() => { setShowSuccess(false); setActivePairingId(null); closeAll(); }}
        onDisconnect={() => { setShowSuccess(false); setActivePairingId(null); closeAll(); }}
      />
    </>
  );
}

/* ========================= */
/*      ENTER TV CODE UI      */
/* ========================= */
function EnterTvCodeModal({ visible, onClose, onConnected, weddingId }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const PAD_H = clamp(W * 0.06, 18, 26);

  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const refA = useRef(null);
  const refB = useRef(null);
  const refC = useRef(null);

  const close = () => {
    Keyboard.dismiss();
    setA('');
    setB('');
    setC('');
    setLoading(false);
    onClose?.();
  };

  const canConnect = a.trim().length === 2 && b.trim().length === 2 && c.trim().length === 2;

  const connect = async () => {
    if (!canConnect || loading) return;
    const pairingId = `${a.trim()}-${b.trim()}-${c.trim()}`.toUpperCase();

    if (!weddingId) {
      Alert.alert('Error', 'Wedding not loaded. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const result = await confirmPairing(pairingId, weddingId);
      close();
      onConnected?.(result.pairingId || pairingId);
    } catch (err) {
      setLoading(false);
      Alert.alert('Connection Failed', err.message || 'Invalid code or session expired.');
    }
  };

  const boxW = clamp(W * 0.18, 64, 78);
  const boxH = clamp(W * 0.18, 64, 78);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: '#0A0A0A80' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={[styles.sheet, { minHeight: clamp(H * 0.52, 320, 460), marginBottom: kbHeight }]}>
            <View style={[styles.header, { paddingHorizontal: PAD_H }]}>
              <Text style={styles.headerTitle}>Enter Tv Code</Text>
              <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#111" />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={[styles.codeContent, { paddingHorizontal: PAD_H }]}>
              <Text style={styles.codeTitle}>Enter the code shown{'\n'}on your TV screen</Text>

              <View style={[styles.codeRow, { marginTop: 20 }]}>
                <CodeBox
                  value={a}
                  setValue={(v) => { setA(v); if (v.length === 2) refB.current?.focus?.(); }}
                  refObj={refA}
                  w={boxW}
                  h={boxH}
                  onBackspaceWhenEmpty={() => {}}
                />
                <Text style={styles.hyphen}>-</Text>
                <CodeBox
                  value={b}
                  setValue={(v) => { setB(v); if (v.length === 2) refC.current?.focus?.(); }}
                  refObj={refB}
                  w={boxW}
                  h={boxH}
                  onBackspaceWhenEmpty={() => { if (b.length === 0) refA.current?.focus?.(); }}
                />
                <Text style={styles.hyphen}>-</Text>
                <CodeBox
                  value={c}
                  setValue={setC}
                  refObj={refC}
                  w={boxW}
                  h={boxH}
                  onBackspaceWhenEmpty={() => { if (c.length === 0) refB.current?.focus?.(); }}
                />
              </View>

              <Text style={styles.codeHint}>
                The code is displayed at the top of your TV screen
              </Text>
            </View>

            {/* Buttons pinned at footer */}
            <View style={[styles.codeFooter, { paddingHorizontal: PAD_H, paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={connect}
                disabled={!canConnect || loading}
                style={[
                  styles.connectBtn,
                  canConnect && !loading && { backgroundColor: '#F96A86' },
                  (!canConnect || loading) && { opacity: 0.5 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.connectText}>Connect</Text>
                )}
              </TouchableOpacity>

              <Pressable onPress={close} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
      </View>
    </Modal>
  );
}

function CodeBox({ value, setValue, refObj, w, h, onBackspaceWhenEmpty }) {
  return (
    <TextInput
      ref={refObj}
      value={value}
      onChangeText={(t) => {
        const cleaned = (t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        setValue(cleaned.slice(0, 2));
      }}
      onKeyPress={({ nativeEvent }) => {
        if (nativeEvent.key === 'Backspace' && (value || '').length === 0) {
          onBackspaceWhenEmpty?.();
        }
      }}
      autoCapitalize="characters"
      maxLength={2}
      keyboardType="default"
      style={[styles.codeBox, { width: w, height: h }]}
      textAlign="center"
      returnKeyType="done"
      cursorColor="#111"
      selectionColor="#111"
    />
  );
}

const styles = StyleSheet.create({
  kavFull: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    display: 'flex',
    flexDirection: 'column',
  },
  codeContent: {
    alignItems: 'center',
    paddingTop: 20,
    flex: 1,
  },
  codeFooter: {
    marginTop: 'auto',
  },
  header: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E9E9E9',
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  qrWrap: {
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#2b2b2b',
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  camText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    borderColor: '#FF4D6D',
  },
  title: {
    marginTop: 44,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 20,
    color: '#111',
    lineHeight: 22,
    width: '100%',
  },
  sub: {
    marginTop: 10,
    textAlign: 'center',
    color: '#8a8a8a',
    fontSize: 13,
  },
  footerBtn: {
    width: '100%',
    marginTop: 16,
    height: 48,
  },
  codeTitle: {
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 20,
    color: '#111',
    lineHeight: 24,
  },
  codeRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBox: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 14,
    backgroundColor: '#fff',
    fontSize: 20,
    fontWeight: '800',
   color:'#A7A5A5',

    marginHorizontal: 6,
    underlineColorAndroid: 'transparent',
  },
  hyphen: {
    color: '#999',
    fontWeight: '800',
    fontSize: 18,
    marginHorizontal: 6,
  },
  codeHint: {
    marginTop: 14,
    textAlign: 'center',
    color: '#9a9a9a',
    fontSize: 13,
  },
  connectBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#A7A5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#9a9a9a',
    fontSize: 12,
    fontWeight: '600',
  },
});
