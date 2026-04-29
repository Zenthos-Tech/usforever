import { Modal, Pressable, StyleSheet, View } from 'react-native';

import DeleteIcon from '../assets/images/Trash.svg';
import RenameIcon from '../assets/images/edit3.svg';
import VisibleIcon from '../assets/images/lock.svg';

import { HoldAction } from './FolderTile';

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

export default function FolderHoldActionsModal({
  visible,
  onClose,
  holdW,
  holdH,
  holdPos,
  isSelectedActive,
  onRename,
  onDelete,
  cText,
  cBorder,
  cDanger,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
          onPress={onClose}
        />

        <View
          style={[
            styles.holdBarWrap,
            { width: holdW, height: holdH, top: holdPos.top, left: holdPos.left },
          ]}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#ECEBEC', borderRadius: 12 },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'transparent',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: hexToRgba(cText, 0.10) ?? cBorder,
              },
            ]}
          />

          <View style={styles.holdRow}>
            {isSelectedActive ? (
              <>
                <HoldAction Icon={VisibleIcon} label="Visible" onPress={onClose} />
                <View
                  style={[
                    styles.holdDivider,
                    { backgroundColor: hexToRgba(cText, 0.12) ?? cBorder },
                  ]}
                />
              </>
            ) : null}

            <HoldAction
              Icon={RenameIcon}
              label="Rename"
              color={cText}
              onPress={onRename}
            />

            <View
              style={[
                styles.holdDivider,
                { backgroundColor: hexToRgba(cText, 0.12) ?? cBorder },
              ]}
            />

            <HoldAction
              Icon={DeleteIcon}
              label="Delete"
              color={cDanger}
              onPress={onDelete}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  holdBarWrap: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 22,
  },
  holdRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  holdDivider: { width: 1, height: 28, opacity: 0.95 },
});
