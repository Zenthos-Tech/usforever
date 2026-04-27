import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import TickIcon from '../assets/images/tick2.svg';
import TvIcon from '../assets/images/tv2.svg';
import { API_URL } from '../utils/api';

const POLL_INTERVAL = 5000;

const ConnectionSuccessModal = ({ visible, pairingId, onClose, tvName, onDisconnect, onConnectAnother }) => {
  const { height: H } = useWindowDimensions();
  const pollRef = useRef(null);

  useEffect(() => {
    if (!visible || !pairingId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/tv/pair/status?pairingId=${pairingId}`);
        const data = await res.json();
        if (data.status !== 'PAIRED') {
          onClose?.();
        }
      } catch (_) {}
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [visible, pairingId]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalContainer, { height: Math.round(H * 0.7) }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Connection Done</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#111" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.content}>

            {/* Tick icon */}
            <View style={styles.successCircle}>
              <TickIcon width={130} height={130} color="#fff" />
            </View>

            <Text style={styles.mainTitle}>Connected to TV</Text>
            <Text style={styles.subText}>
              Your wedding album is now playing on TV
            </Text>

            {/* Device card */}
            <View style={styles.deviceCard}>
              <TvIcon width={50} height={50} />
              <View style={styles.deviceDetails}>
                <Text style={styles.deviceLabel}>Now playing on</Text>
                <Text style={styles.deviceName}>{tvName || 'TV'}</Text>
              </View>
              <View style={styles.statusDot} />
            </View>

            {/* Disconnect */}
            <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginTop: 5,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop:15,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  subText: {
    textAlign: 'center',
    color: '#525252',

    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    
    
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginBottom: 32,
  },
  tvIconContainer: {},
  deviceDetails: {
    flex: 1,
    marginLeft: 14,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F96A86',
  },
  disconnectBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#A7A5A5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: {
    color:'#FFFFFF',

    fontWeight: '600',
    fontSize: 15,
  },
});

export default ConnectionSuccessModal;
