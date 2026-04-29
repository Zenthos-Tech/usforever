import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/theme/colors';
import { API_URL } from '../utils/api';
import { getAuthToken } from '../utils/authToken';

import CloseIcon from '../assets/images/close.svg';
import CopyIcon from '../assets/images/copy.svg';
import DisabledIcon from '../assets/images/disabled.svg';
import EnabledIcon from '../assets/images/enabled.svg';
import LinkIcon from '../assets/images/link2.svg';
import LogoTitle from '../assets/images/logo-title.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

async function getAuthHeaders() {
  const token = await getAuthToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

function expiryLabel(expiresAt) {
  if (!expiresAt) return 'No Limit';
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

function roleLabel(role) {
  if (role === 'photographer') return 'Photographer';
  if (role === 'guest') return 'Family';
  return role;
}

export default function SharedLinksModal({ visible, onClose, weddingId }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [links, setLinks] = useState([]);
  const [error, setError] = useState('');

  const pad = clamp(W * 0.05, 16, 24);
  const sheetH = clamp(H * 0.90, 540, 780);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (!visible || !weddingId) return;
    let cancelled = false;

    const fetch_ = async () => {
      setError('');
      setLinks([]);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${API_URL}/share-links?weddingId=${encodeURIComponent(weddingId)}`,
          { headers }
        );
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) setLinks(
          (data.links || []).filter(l => !l.expired && (!l.expiresAt || new Date(l.expiresAt) > Date.now()))
        );
          else setError(data?.error || 'Failed to load links.');
        }
      } catch {
        if (!cancelled) setError('Network error.');
      } finally {
      }
    };

    fetch_();
    return () => { cancelled = true; };
  }, [visible, weddingId]);

  const handleCopy = async (url) => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    showToast();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { height: sheetH, paddingHorizontal: pad, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.headerTitle}>Shared Access Links</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <CloseIcon width={22} height={22} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { marginHorizontal: -pad }]} />

          {/* Logo */}
          <LogoTitle width={120} height={20} style={styles.logo} />

          {/* Subtitle */}
          <Text style={styles.subtitle}>Manage your album sharing links</Text>

          {/* Content */}
          {error ? (
            <View style={styles.center}>
              <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : links.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ color: Colors.textSecondary }}>No active share links yet.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {links.map((link) => (
                <LinkCard
                  key={link.slug}
                  link={link}
                  pad={pad}
                  onCopy={() => handleCopy(link.shareUrl)}
                />
              ))}
            </ScrollView>
          )}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              },
            ]}
          >
            <Text style={styles.toastText}>Link copied to clipboard</Text>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LinkCard({ link, onCopy }) {
  const isExpired = link.expired;
  const urlDisplay = (link.shareUrl || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');

  return (
    <View style={[styles.card, isExpired && { opacity: 0.5 }]}>
      {/* Role badge */}
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{roleLabel(link.role)}</Text>
      </View>

      {/* URL row */}
      <View style={styles.urlRow}>
        <LinkIcon width={16} height={16} style={{ marginRight: 6 }} />
        <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="tail">
          {urlDisplay || '—'}
        </Text>
        <TouchableOpacity onPress={onCopy} hitSlop={8} disabled={!link.shareUrl || isExpired}>
          <CopyIcon width={18} height={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardDivider} />

      {/* Meta rows */}
      <MetaRow label="Created"  value={formatDate(link.createdAt)} />
      <MetaRow
        label="Expiry"
        value={expiryLabel(link.expiresAt)}
        valueColor={isExpired ? '#c00' : undefined}
      />
      <MetaRow
        label="Passcode"
        value={link.requiresPasscode ? 'Enabled' : 'Disabled'}
        icon={link.requiresPasscode
          ? <EnabledIcon width={14} height={14} />
          : <DisabledIcon width={14} height={14} />
        }
        valueColor={link.requiresPasscode ? '#22a559' : Colors.textSecondary}
      />

      {/* Copy button */}
      <TouchableOpacity
        style={[styles.copyBtn, (!link.shareUrl || isExpired) && { opacity: 0.4 }]}
        onPress={onCopy}
        disabled={!link.shareUrl || isExpired}
        activeOpacity={0.85}
      >
        <Text style={styles.copyBtnText}>Copy Link</Text>
      </TouchableOpacity>
    </View>
  );
}

function MetaRow({ label, value, icon, valueColor }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <View style={styles.metaValueRow}>
        {icon && <View style={{ marginRight: 4 }}>{icon}</View>}
        <Text style={[styles.metaValue, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  logo: {
    height: 20,
    alignSelf: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: "#666263",

    textAlign: 'center',
    marginBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.primaryPink,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#FAF5FF',
    marginBottom: 10,
  },
  roleText: {
    fontSize: 11,
    color: '#F96A86',
    fontWeight: '600',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  copyBtn: {
    marginTop: 10,
    backgroundColor: Colors.primaryPink,
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  toast: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
    backgroundColor: Colors.primaryPink ?? '#E85A70',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
