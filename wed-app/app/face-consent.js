import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton from '@/components/PrimaryButton';
import Colors from '@/theme/colors';

import CloseIcon from '../assets/images/close.svg';
import ShieldIcon from '../assets/images/shield.svg';
import TickIcon from '../assets/images/tick.svg';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function FaceConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [agreed, setAgreed] = useState(false);

  const short = Math.min(W, H);
  const pad = useMemo(() => clamp(short * 0.06, 16, 24), [short]);
  const radius = 20;

  const onClose = () => router.back();
  const onSkip = () => router.back();

  const handleContinue = () => {
    if (!agreed) return;
    router.push('/face-recognition');
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView
          intensity={70}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overlayTint} />
      </Pressable>

      <View
        style={[
          styles.card,
          {
            paddingHorizontal: pad,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Photos That Hold You</Text>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <CloseIcon width={20} height={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.iconWrap}>
          <ShieldIcon width={80} height={80} />
        </View>

        <Text style={styles.mainText}>
          Your photo is used only to show you the moments that include you.
        </Text>

        <Text style={styles.subText}>
          You can delete it anytime—it's always your choice.
        </Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreed((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <TickIcon width={10} height={10} />}
          </View>

          <Text style={styles.checkboxText}>I understand and agree</Text>
        </TouchableOpacity>

        <View style={styles.buttonWrap}>
         <PrimaryButton
  title="ALLOW & CONTINUE"
  enabled={agreed}
  onPress={handleContinue}
  height={44}
  radius={14}
  textStyle={styles.primaryButtonText}
/>
        </View>

        <TouchableOpacity onPress={onSkip}>
          <Text style={styles.skip}>SKIP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  card: {
    width: '100%',
    backgroundColor: '#fff',
    paddingTop: 14,
    overflow: 'hidden',
  },

  header: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    marginBottom: 12,
    position: 'relative',
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    marginTop: 10,
  },

  closeBtn: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -10,
    height: 20,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginTop: 10,
    marginHorizontal: -18,
    marginBottom: 16,
  },

  iconWrap: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: -5,
  },

  mainText: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },

  subText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#777',
    marginBottom: 20,
    marginTop: 5,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxActive: {
    backgroundColor: Colors.primaryPink,
    borderColor: Colors.primaryPink,
  },

  checkboxText: {
    fontSize: 12,
    color: '#666',
  },

  buttonWrap: {
    marginTop: 16,
    marginBottom: 10,
    alignItems: 'center',
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#fff',
  },

  primaryButtonTextDisabled: {
    color: '#A7A5A5',
  },

  skip: {
    textAlign: 'center',
    fontSize: 12,
    color: '#191919',
    textDecorationLine: 'underline',
  },
});