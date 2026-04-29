import { StyleSheet } from 'react-native';

export const BAR_BG = '#FFFFFFBD';

export const galleryStyles = StyleSheet.create({
  container: { flex: 1 },

  galleryHeaderCard: {
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    alignSelf: 'stretch',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  galleryTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTitle: { fontWeight: '800', textAlign: 'center' },

  uploadCircle: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  uploadLabel: { fontWeight: '700', textAlign: 'center' },

  floatingStack: {
    position: 'absolute',
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
  },

  floatingGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadCard: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },

  groupCard: {
    overflow: 'hidden',
  },

  facialCard: {
    overflow: 'hidden',
  },
  facialCircleWrap: {
    backgroundColor: '#fff',
  },

  facialLabelText: {
    lineHeight: 12,
    textAlign: 'center',
  },

  videoBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.4,
  },

  selOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.00)',
  },
  selOverlayOn: { backgroundColor: 'rgba(0,0,0,0.18)' },
  selBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: BAR_BG,
  },
  bottomBar: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: BAR_BG,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bottomRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  bottomBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  bottomText: { marginTop: 3, fontWeight: '700', fontSize: 11 },
});
