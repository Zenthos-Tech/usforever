import { StyleSheet } from 'react-native';

export const previewStyles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", backgroundColor:"#FFFFFF" },
  headerBtn: { alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },

  title: { fontWeight: "800" },
  subtitle: { marginTop: 3, fontWeight: "600" },

  body: { flex: 1, justifyContent: "center", paddingTop: 12 },

  card: {
    overflow: "hidden",
  },

  imageClip: { flex: 1, overflow: "hidden" },
  imageFill: { width: "100%", height: "100%" },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  hintCol: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    marginTop: 4,
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  heartWrap: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    elevation: 10,
  },

  freezeWrap: { ...StyleSheet.absoluteFillObject, zIndex: 55, elevation: 55 },

  centerStageWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    elevation: 60,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
  },
  blurFreezeWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 58,
    elevation: 58,
  },

  blurGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  actionBtn: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  actionText: { marginTop: 3, fontWeight: "700" },

  // Clip container for the Selected path (hides the strip below bottom edge)
  selectedPathClip: {
    position: "absolute",
    left: "50%",
    marginLeft: -24,
    width: 48,
    overflow: "hidden",
    zIndex: 95,
    elevation: 95,
  },
  // Vertical "Selected" path (inside clip container)
  selectedPathWrap: {
    width: 48,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: "rgba(232, 90, 112, 0.12)",
  },
  selectedPathTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(232, 90, 112, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  selectedPathBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  selectedPathText: {
    color: "#E85A70",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 1,
    width: 100,
    textAlign: "center",
    transform: [{ rotate: "-90deg" }],
  },

  // "Selected Folder" icon (bottom-right during swipe)
  selectedFolderWrap: {
    position: "absolute",
    right: 20,
    alignItems: "center",
    zIndex: 95,
    elevation: 95,
  },
  selectedFolderIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#E85A70",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedFolderLabel: {
    color: "#E85A70",
    fontWeight: "700",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },

  // "Saved to Selected" pink pill toast (bottom-center of image)
  savedToast: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
    elevation: 100,
  },
  savedToastText: {
    backgroundColor: "#E85A70",
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    overflow: "hidden",
  },
});

