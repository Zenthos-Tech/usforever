import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import Colors from "@/theme/colors";
import FixedSidePeeks from "../components/FixedSidePeeks";
import ImageDeleteConfirmModal from "../components/ImageDeleteConfirmModal";
import PreviewBottomAction from "../components/PreviewBottomAction";
import ZoomableImage from "../components/ZoomableImage";
import { useImages } from "../context/ImagesContext";
import { previewStyles as styles } from "../styles/dynamicImagePreview";
import { API_URL } from "../utils/api";

import BackIcon from "../assets/images/Back icon.svg";
import HeartIcon from "../assets/images/heart.svg";
import SelectedIcon from "../assets/images/selected.svg";
import ShareIcon from "../assets/images/Share.svg";
import SwipeUpIcon from "../assets/images/swipeup.svg";
import DeleteIcon from "../assets/images/Trash.svg";

const SWIPE_UP_THRESHOLD = -100;
const CENTER_HIDE_MS = 450;

// ✅ timings you can tweak
const PEEKS_SHOW_MS = 500;

const FALLBACK_SELECTED_KEY = "Selected";
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

function hexToRgba(hex, alpha) {
  const h = String(hex || "")
    .replace("#", "")
    .trim();
  if (!(h.length === 3 || h.length === 6)) return undefined;
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
  return `rgba(${r},${g},${b},${alpha})`;
}

const isHttpUri = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const isFileUri = (u) => typeof u === "string" && /^file:\/\//i.test(u);
const isContentUri = (u) => typeof u === "string" && /^content:\/\//i.test(u);

const joinUrl = (base, path) => {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  if (!b) return `/${p}`;
  return `${b}/${p}`;
};

const norm = (v) =>
  String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getRawUri = (item) => {
  if (!item) return "";
  const u =
    item.uri ||
    item.url ||
    item.imageUrl ||
    item.src ||
    item.image_url ||
    item.imageUrlKey ||
    item.key ||
    item.path;
  return typeof u === "string" ? u.trim() : "";
};

const resolveDisplayUri = (raw) => {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (isHttpUri(u) || isFileUri(u) || isContentUri(u) || u.includes("://"))
    return u;
  return joinUrl(API_URL, u);
};

const getEventName = (img) =>
  img?.event ||
  img?.folderName ||
  img?.folder ||
  img?.albumName ||
  img?.category ||
  "";

const safeParseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDdMmYyyyWeekday = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const w = weekdays[d.getDay()];
  return `${dd}-${mm}-${yyyy}, ${w}`;
};

// ✅ Header date from CURRENT IMAGE "uploaded/created" date
const formatHeaderDateFromImage = (img) => {
  const raw =
    img?.uploadedAt ||
    img?.uploaded_at ||
    img?.createdAt ||
    img?.created_at ||
    img?.date ||
    img?.timestamp ||
    img?.time ||
    "";
  const d = safeParseDate(raw);
  return d ? formatDdMmYyyyWeekday(d) : "";
};


export default function DynamicImagePreview() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const folderName = String(params?.folderName || "").trim();
  const selectedIdParam = params?.id ? String(params.id) : "";

  // ✅ FIX #1: robust disableSwipe parsing (supports '1', 'true', and your extra flags)
  const disableSwipe = useMemo(() => {
    const v = norm(params?.disableSwipe);
    const v2 = norm(params?.disable_swipe);
    const truthy = (s) => ["1", "true", "yes", "y", "on"].includes(norm(s));
    return (
      truthy(v) ||
      truthy(v2) ||
      truthy(params?.fromSelected) ||
      truthy(params?.alreadySelected) ||
      truthy(params?.savedOnce)
    );
  }, [params]);

  // ✅ if you pass albumId from gallery, we’ll forward it (safe)
  const albumIdParam = params?.albumId ? String(params.albumId) : "";
  const roleParam = String(params?.role || "").toLowerCase().trim();
  const isGuest = roleParam === "guest";

  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const {
    images,
    selectedImage,
    activeAlbumId,
    setAlbumScope,
    refreshActiveAlbum,

    getFavoritesByEvent,
    previewFromFavorites,
    setPreviewFromFavorites,

    getSelectedByEvent,
    previewFromSelected,
    setPreviewFromSelected,
    addToSelected,

    removeImage,
  } = useImages();

  useEffect(() => {
    if (albumIdParam && albumIdParam !== activeAlbumId) {
      setAlbumScope(albumIdParam);
    }
  }, [albumIdParam, activeAlbumId, setAlbumScope]);

  useEffect(() => {
    if (images.length === 0 && (albumIdParam || activeAlbumId)) {
      refreshActiveAlbum();
    }
  }, [albumIdParam, activeAlbumId]);

  const cText = "#111111";
  const cMuted = "#777777";
  const cDanger = "#E53935";

  const cPage = "#FFFFFF";
  const cCard = "#FFFFFF";
  const imageBg = "#FFFFFF";

  const cBorder = "transparent";

  const headerPadH = useMemo(() => clamp(W * 0.045, 14, 22), [W]);
  const headerPadV = useMemo(() => clamp(H * 0.012, 10, 16), [H]);
  const backIcon = useMemo(() => clamp(W * 0.06, 22, 28), [W]);

  const barIcon = useMemo(() => clamp(W * 0.055, 18, 24), [W]);
  const titleSize = useMemo(() => clamp(W * 0.048, 16, 20), [W]);
  const dateSize = useMemo(() => clamp(W * 0.032, 12, 14), [W]);

  const hintFont = useMemo(() => clamp(W * 0.032, 12, 14), [W]);
  const swipeUpSize = useMemo(() => clamp(W * 0.085, 26, 38), [W]);

  const CARD_RADIUS = useMemo(() => clamp(W * 0.06, 18, 26), [W]);

  const IMG_PAD = 0;
  const IMG_RADIUS = useMemo(
    () => Math.max(10, CARD_RADIUS - 6),
    [CARD_RADIUS],
  );

  const bottomPad = useMemo(() => Math.max(insets.bottom, 0), [insets.bottom]);
  const footerBaseH = useMemo(() => clamp(H * 0.075, 56, 68), [H]);
  const footerTotalH = useMemo(
    () => footerBaseH + bottomPad,
    [footerBaseH, bottomPad],
  );

  const cardTopOffset = useMemo(() => clamp(H * 0.02, 12, 18), [H]);
  const PAGE_W = useMemo(() => W, [W]);

  const ACTION_W = useMemo(() => clamp(W * 0.32, 112, 148), [W]);
  const ACTION_H = useMemo(() => clamp(H * 0.06, 42, 52), [H]);
  const ACTION_GAP = useMemo(() => clamp(W * 0.04, 12, 18), [W]);

  const [isZoomed, setIsZoomed] = useState(false);
  const isZoomedRef = useRef(false);

  const handleZoomChange = useCallback((zoomed) => {
    isZoomedRef.current = zoomed;
    setIsZoomed(zoomed);
  }, []);

  // ✅ NEW: delete popup state (same pattern as gallery)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const selectedEventKey = useMemo(
    () => (folderName || FALLBACK_SELECTED_KEY).trim(),
    [folderName],
  );

  const preferredEventKey = useMemo(() => {
    const fromFolder = norm(folderName);
    const fromSelected = norm(getEventName(selectedImage));
    return fromFolder || fromSelected || "";
  }, [folderName, selectedImage]);

  const previewImages = useMemo(() => {
    const list = Array.isArray(images) ? images : [];

    if (previewFromSelected) {
      const selBase = getSelectedByEvent(selectedEventKey);
      return (selBase || []).filter((x) => !!resolveDisplayUri(getRawUri(x)));
    }

    if (previewFromFavorites) {
      const favBase = getFavoritesByEvent(folderName);
      return (favBase || []).filter((x) => !!resolveDisplayUri(getRawUri(x)));
    }

    const folderKey = norm(folderName);
    let filtered = folderKey
      ? list.filter((img) => norm(getEventName(img)) === folderKey)
      : [];

    if (filtered.length === 0) {
      const selKey = norm(getEventName(selectedImage));
      if (selKey)
        filtered = list.filter((img) => norm(getEventName(img)) === selKey);
    }

    if (filtered.length === 0) filtered = list.slice();
    filtered = filtered.filter((x) => !!resolveDisplayUri(getRawUri(x)));

    const pickId = selectedImage?.id ?? selectedIdParam;
    if (pickId && filtered.length > 0) {
      const has = filtered.some((x) => String(x.id) === String(pickId));
      if (!has) {
        const found = list.find((x) => String(x.id) === String(pickId));
        if (found && resolveDisplayUri(getRawUri(found)))
          filtered.unshift(found);
      }
    }

    return filtered;
  }, [
    images,
    folderName,
    selectedEventKey,
    selectedImage,
    selectedIdParam,
    previewFromFavorites,
    getFavoritesByEvent,
    previewFromSelected,
    getSelectedByEvent,
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const pendingRecenterRef = useRef(false);
  const ignoreViewableRef = useRef(false);

  const blurOverlayOpacity = useRef(new Animated.Value(0)).current;
  const blurContentOpacity = useRef(new Animated.Value(0)).current;


  const dragY = useRef(new Animated.Value(0)).current;
  const mainOpacity = useRef(new Animated.Value(1)).current;

  // ✅ stage ONLY for the center image movement
  const stageOpacity = useRef(new Animated.Value(0)).current;
  const stageX = useRef(new Animated.Value(0)).current;
  const stageY = useRef(new Animated.Value(0)).current;
  const stageScale = useRef(new Animated.Value(1)).current;
  const stageDim = useRef(new Animated.Value(1)).current;

  // ✅ drag-driven values for main image (separate from stage)
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  // ✅ folder container + saved toast
  const folderContainerOpacity = useRef(new Animated.Value(0)).current;
  const savedToastOpacity = useRef(new Animated.Value(0)).current;

  const [freezeUri, setFreezeUri] = useState("");
  const freezeOpacity = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

  const PEEK = useMemo(() => clamp(W * 0.12, 44, 70), [W]);
  const GAP = useMemo(() => clamp(W * 0.03, 10, 16), [W]);

  // ✅ hint until first save
  const [swipeHintPhase, setSwipeHintPhase] = useState("idle"); // 'idle' | 'swiping'
  const [hintDisabled, setHintDisabled] = useState(false);

  // ✅ peeks only during "image goes up" (save animation) for 1 sec
  const [peeksOn, setPeeksOn] = useState(false);
  const peeksTimerRef = useRef(null);

  const clearPeeksTimer = () => {
    if (peeksTimerRef.current) clearTimeout(peeksTimerRef.current);
    peeksTimerRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearPeeksTimer();
      setPreviewFromFavorites(false);
      setPreviewFromSelected(false);
    };
  }, [setPreviewFromFavorites, setPreviewFromSelected]);

  useEffect(() => {
    if (previewImages.length === 0) return;

    const targetId = selectedImage?.id ?? selectedIdParam;
    if (!targetId) return;

    const idx = previewImages.findIndex(
      (img) => String(img.id) === String(targetId),
    );
    if (idx !== -1) {
      setCurrentIndex(idx);
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        } catch {}
      }, 80);
    }
  }, [selectedImage, selectedIdParam, previewImages]);

  const lockAnimating = (v) => {
    isAnimatingRef.current = v;
    setIsAnimating(v);
  };



  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const newIdx = viewableItems?.[0]?.index ?? -1;
    console.log('[VIEWABLE] idx=', newIdx, 'isAnimating=', isAnimatingRef.current, 'pendingRecenter=', pendingRecenterRef.current, 'ignore=', ignoreViewableRef.current);
    if (isAnimatingRef.current || pendingRecenterRef.current || ignoreViewableRef.current) return;
    if (viewableItems?.length > 0) {
      console.log('[VIEWABLE] → setCurrentIndex to', newIdx);
      setCurrentIndex(newIdx);
      setHintDisabled(false);
    }
  }).current;

  const selectedListForEvent = useMemo(
    () => getSelectedByEvent(selectedEventKey) || [],
    [getSelectedByEvent, selectedEventKey],
  );

  const isSameImage = (a, b) => {
    if (!a || !b) return false;
    const aId = a?.id != null ? String(a.id) : "";
    const bId = b?.id != null ? String(b.id) : "";
    if (aId && bId && aId === bId) return true;

    const aU = resolveDisplayUri(getRawUri(a));
    const bU = resolveDisplayUri(getRawUri(b));
    return !!aU && !!bU && aU === bU;
  };

  const currentImage = previewImages[currentIndex];

  const currentIsSaved = useMemo(() => {
    if (!currentImage) return false;
    return selectedListForEvent.some((x) => isSameImage(x, currentImage));
  }, [selectedListForEvent, currentImage]);

  const hasMultiple = previewImages.length > 1;

  const prevImage = currentIndex > 0 ? previewImages[currentIndex - 1] : null;
  const nextImage =
    currentIndex < previewImages.length - 1
      ? previewImages[currentIndex + 1]
      : null;

  const prevUri =
    hasMultiple && prevImage ? resolveDisplayUri(getRawUri(prevImage)) : "";
  const currUri = currentImage
    ? resolveDisplayUri(getRawUri(currentImage))
    : "";
  const nextUri =
    hasMultiple && nextImage ? resolveDisplayUri(getRawUri(nextImage)) : "";

  const safeNameFromUrl = (url) => {
    const noQuery = (url || "").split("?")[0];
    const last = noQuery.split("/").pop() || `photo_${Date.now()}.jpg`;
    const clean = last.replace(/[^a-zA-Z0-9._-]/g, "_");
    const hasExt = /\.[a-zA-Z0-9]+$/.test(clean);
    return hasExt ? clean : `${clean}.jpg`;
  };

  const guessMime = (nameOrUrl) => {
    const s = String(nameOrUrl || "").toLowerCase();
    if (s.endsWith(".png")) return "image/png";
    if (s.endsWith(".webp")) return "image/webp";
    if (s.endsWith(".heic") || s.endsWith(".heif")) return "image/heic";
    return "image/jpeg";
  };

  const ensureLocalFileUri = async (inputUri) => {
    const u = String(inputUri || "").trim();
    if (!u) throw new Error("Missing image url");

    if (isFileUri(u)) return u;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!baseDir) throw new Error("No cache directory");

    if (isHttpUri(u)) {
      const fileName = safeNameFromUrl(u);
      const localPath = baseDir + fileName;
      await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(
        () => {},
      );
      const res = await FileSystem.downloadAsync(u, localPath);
      return res?.uri || localPath;
    }

    if (isContentUri(u)) {
      const fileName = `share_${Date.now()}.jpg`;
      const localPath = baseDir + fileName;
      await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(
        () => {},
      );
      await FileSystem.copyAsync({ from: u, to: localPath });
      return localPath;
    }

    const localPath = baseDir + `share_${Date.now()}.jpg`;
    await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(
      () => {},
    );
    await FileSystem.copyAsync({ from: u, to: localPath });
    return localPath;
  };

  const onShare = async () => {
    try {
      const u = resolveDisplayUri(getRawUri(currentImage));
      if (!u) {
        Alert.alert("Share", "Image URL is empty.");
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          "Sharing not available",
          "Sharing is not available on this device.",
        );
        return;
      }

      const fileUri = await ensureLocalFileUri(u);
      const mimeType = guessMime(fileUri);
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: "Share photo",
      });
    } catch (e) {
      console.log("Share error:", e);
      Alert.alert(
        "Share failed",
        String(e?.message || e || "Could not share this photo."),
      );
    }
  };

  const doDelete = async () => {
    if (!currentImage?.id) return;
    try {
      if (albumIdParam) await removeImage(currentImage.id, albumIdParam);
      else await removeImage(currentImage.id);
    } catch (e) {
      console.log("Delete error:", e);
      Alert.alert("Delete failed", String(e?.message || e));
    }
  };

  const onDelete = () => {
    if (!currentImage) return;
    setConfirmDeleteOpen(true);
  };

  const headerTitle =
    (folderName || getEventName(selectedImage) || "Gallery").trim() ||
    "Gallery";
  const headerDate = useMemo(
    () => formatHeaderDateFromImage(currentImage),
    [currentImage],
  );

  // ✅ FIX #2: per-image swipe rule:
  // If the image is already saved (exists in Selected), DO NOT allow swiping that image again.
  const canSwipeThisImage = !disableSwipe && !currentIsSaved && !isGuest;

  const animSavedIndexRef = useRef(0);

  const playSelectedAnimation = () => {
    if (isAnimatingRef.current) return;

    const itemToSave = previewImages[currentIndex];
    if (!itemToSave) return;
    animSavedIndexRef.current = currentIndex;
    console.log('[SAVE START] currentIndex=', currentIndex, 'itemId=', itemToSave?.id);

    clearPeeksTimer();
    if (hasMultiple) {
      setPeeksOn(true);
      peeksTimerRef.current = setTimeout(
        () => setPeeksOn(false),
        PEEKS_SHOW_MS,
      );
    } else {
      setPeeksOn(false);
    }

    if (!hintDisabled && !currentIsSaved) setSwipeHintPhase("swiping");

    lockAnimating(true);
    pendingRecenterRef.current = true;

    // Don't reset — user has already dragged, image is partially up,
    // capsule/folder are already visible. Continue from current state.
    const dropDown = clamp(H * 0.35, 250, 400);
    const slideRight = clamp(W * 0.25, 80, 140);

    // folderContainerOpacity is already showing from the drag
    // stageScale is already partially shrunk from the drag
    // dragY already has the drag offset

    Animated.sequence([
      // Image swoops down-right toward Selected Folder icon, shrinks more
      Animated.parallel([
        Animated.timing(dragY, {
          toValue: dropDown, duration: 400, useNativeDriver: true,
        }),
        Animated.timing(dragX, {
          toValue: slideRight, duration: 400, useNativeDriver: true,
        }),
        Animated.timing(dragScale, {
          toValue: 0.12, duration: 400, useNativeDriver: true,
        }),
        Animated.timing(mainOpacity, {
          toValue: 0, duration: 350, useNativeDriver: true,
        }),
      ]),
      // Everything fades out
      Animated.parallel([
        Animated.timing(folderContainerOpacity, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Save the image
      if (!currentIsSaved && itemToSave?.id) {
        const normalized = {
          ...itemToSave,
          uri:
            itemToSave.uri ||
            itemToSave.url ||
            itemToSave.imageUrl ||
            itemToSave.src ||
            itemToSave.image_url ||
            itemToSave.imageUrlKey ||
            itemToSave.key ||
            itemToSave.path,
        };
        if (normalized?.uri) addToSelected(normalized, selectedEventKey);
      }

      if (!hintDisabled) setHintDisabled(true);
      setSwipeHintPhase("idle");

      console.log('[SAVE DONE] animSavedIndexRef=', animSavedIndexRef.current, 'currentIndex=', currentIndex);

      // Reset all animation values
      dragY.setValue(0);
      dragX.setValue(0);
      dragScale.setValue(1);
      freezeOpacity.setValue(0);
      folderContainerOpacity.setValue(0);

      // Hard lock to prevent stale viewable events from overwriting index
      ignoreViewableRef.current = true;

      const targetIdx = animSavedIndexRef.current;
      const targetOffset = targetIdx * PAGE_W;

      // 1. Do state changes while invisible
      setFreezeUri("");
      setCurrentIndex(targetIdx);

      // 2. Wait for re-render, then scroll, then fade in
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: targetOffset, animated: false });
        console.log('[SCROLL BACK] scrolled to index=', targetIdx, 'offset=', targetOffset);

        setTimeout(() => {
          // 3. Scroll again after FlatList settles (re-render may have reset it)
          flatListRef.current?.scrollToOffset({ offset: targetOffset, animated: false });

          // 4. Now fade in
          Animated.timing(mainOpacity, {
            toValue: 1, duration: 200, useNativeDriver: true,
          }).start(() => {
            pendingRecenterRef.current = false;
            setTimeout(() => {
              ignoreViewableRef.current = false;
            }, 200);
            console.log('[RESTORE DONE]');

        // Frames 14-17: show "Saved to Selected" pink toast
        Animated.sequence([
          Animated.timing(savedToastOpacity, {
            toValue: 1, duration: 200, useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(savedToastOpacity, {
            toValue: 0, duration: 300, useNativeDriver: true,
          }),
        ]).start(() => {
          lockAnimating(false);
          console.log('[ANIM COMPLETE] lockAnimating=false, ready for next swipe');
        });
      });
        }, 50);
      }, 50);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => false,
        onStartShouldSetPanResponder: () => false,

        onMoveShouldSetPanResponderCapture: (_, g) => {
          if (!canSwipeThisImage) return false;
          if (isAnimatingRef.current) return false;
          if (isZoomedRef.current) return false;
          const vertical = Math.abs(g.dy) > Math.abs(g.dx);
          return vertical && g.dy < -8;
        },
        onMoveShouldSetPanResponder: (_, g) => {
          if (!canSwipeThisImage) return false;
          if (isAnimatingRef.current) return false;
          if (isZoomedRef.current) return false;
          const vertical = Math.abs(g.dy) > Math.abs(g.dx);
          return vertical && g.dy < -8;
        },

        onPanResponderGrant: () => {
          // Capture the current image for the freeze overlay at drag start
          const item = previewImages[currentIndex];
          if (item) {
            const u = resolveDisplayUri(getRawUri(item));
            setFreezeUri(u || "");
          }
        },
        onPanResponderMove: (_, g) => {
          if (!canSwipeThisImage) return;
          if (isAnimatingRef.current) return;

          if (g.dy < 0) {
            if (!hintDisabled && !currentIsSaved) setSwipeHintPhase("swiping");

            const lim = -clamp(H * 0.35, 180, 320);
            const clampedDy = Math.max(lim, g.dy);

            // progress 0→1 as user drags up
            const progress = Math.min(1, Math.abs(clampedDy) / Math.abs(lim));

            // Show freeze overlay (drag image), fully hide FlatList
            freezeOpacity.setValue(1);
            mainOpacity.setValue(0);

            // Move and shrink freeze image
            dragY.setValue(clampedDy);
            dragScale.setValue(1 - progress * 0.4);

            // show Selected capsule + folder icon behind image
            folderContainerOpacity.setValue(progress);
          }
        },
        onPanResponderRelease: (_, g) => {
          if (!canSwipeThisImage) return;
          if (isAnimatingRef.current) return;

          const shouldSave = g.dy < SWIPE_UP_THRESHOLD;

          if (shouldSave) {
            playSelectedAnimation();
          } else {
            // snap back: hide freeze, restore main, reset everything
            if (!hintDisabled && !currentIsSaved) setSwipeHintPhase("idle");
            Animated.parallel([
              Animated.spring(dragY, { toValue: 0, useNativeDriver: true }),
              Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }),
              Animated.timing(folderContainerOpacity, {
                toValue: 0, duration: 150, useNativeDriver: true,
              }),
              Animated.timing(freezeOpacity, {
                toValue: 0, duration: 150, useNativeDriver: true,
              }),
              Animated.timing(mainOpacity, {
                toValue: 1, duration: 150, useNativeDriver: true,
              }),
            ]).start(() => {
              setFreezeUri("");
            });
          }
        },
        onPanResponderTerminate: () => {
          if (!hintDisabled && !currentIsSaved) setSwipeHintPhase("idle");
          Animated.parallel([
            Animated.spring(dragY, { toValue: 0, useNativeDriver: true }),
            Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }),
            Animated.timing(folderContainerOpacity, {
              toValue: 0, duration: 150, useNativeDriver: true,
            }),
            Animated.timing(freezeOpacity, {
              toValue: 0, duration: 150, useNativeDriver: true,
            }),
            Animated.timing(mainOpacity, {
              toValue: 1, duration: 150, useNativeDriver: true,
            }),
          ]).start(() => {
            setFreezeUri("");
          });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      canSwipeThisImage,
      H,
      currentIndex,
      previewImages,
      selectedEventKey,
      currentIsSaved,
      hintDisabled,
      hasMultiple,
    ],
  );

  const combinedStageY = Animated.add(dragY, stageY);

  const showHintUI =
    previewImages.length > 0 &&
    canSwipeThisImage &&
    !isAnimating &&
    !hintDisabled &&
    !currentIsSaved &&
    swipeHintPhase !== "swiping";
  const isSwipeActive = swipeHintPhase === "swiping";
  const showPeeks =
    hasMultiple &&
    canSwipeThisImage &&
    !currentIsSaved &&
    !isSwipeActive &&
    peeksOn;

  return (
    <View style={[styles.container, { backgroundColor: cPage }]}>
    <StatusBar barStyle="dark-content" backgroundColor={cPage} />
    <SafeAreaView style={[styles.container, { backgroundColor: cPage }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingHorizontal: headerPadH, paddingVertical: headerPadV },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { width: clamp(W * 0.12, 44, 56) }]}
          activeOpacity={0.85}
        >
          <BackIcon width={backIcon} height={backIcon} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[styles.title, { fontSize: titleSize, color: cText }]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          {!!headerDate && (
            <Text
              style={[styles.subtitle, { fontSize: dateSize, color: cMuted }]}
              numberOfLines={1}
            >
              {headerDate}
            </Text>
          )}
        </View>

        <View style={[styles.headerBtn, { width: clamp(W * 0.12, 44, 56) }]} />
      </View>

      {/* Body */}
      <View
        style={[
          styles.body,
          { paddingBottom: footerTotalH + 12 },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              flex: 1,
              width: "100%",
              backgroundColor: imageBg,
            },
          ]}
        >
          {previewImages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text
                style={{
                  color: cMuted,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                No images found
              </Text>
              <Text
                style={{ color: cMuted, marginTop: 8, textAlign: "center" }}
              >
                (event: {preferredEventKey || "none"})
              </Text>
            </View>
          ) : (
            <View
              style={{ flex: 1 }}
              {...(canSwipeThisImage ? panResponder.panHandlers : {})}
            >
              {showPeeks ? (
                <FixedSidePeeks
                  W={W}
                  peek={PEEK}
                  gap={GAP}
                  prevUri={prevUri}
                  nextUri={nextUri}
                  bg={imageBg}
                />
              ) : null}

              <Animated.View
                style={{
                  flex: 1,
                  opacity: mainOpacity,
                }}
              >
                <FlatList
                  ref={flatListRef}
                  data={previewImages}
                  horizontal
                  pagingEnabled
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1 }}
                  scrollEnabled={!isAnimating && !isZoomed}
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                  keyExtractor={(item) =>
                    String(
                      item?.id ??
                        resolveDisplayUri(getRawUri(item)) ??
                        Math.random(),
                    )
                  }
                  getItemLayout={(_, index) => ({
                    length: PAGE_W,
                    offset: PAGE_W * index,
                    index,
                  })}
                  renderItem={({ item }) => {
                    const u = resolveDisplayUri(getRawUri(item));
                    return (
                      <View
                        style={{ width: PAGE_W, flex: 1, padding: IMG_PAD }}
                      >
                        <ZoomableImage
                          uri={u}
                          imgRadius={IMG_RADIUS}
                          imageBg={imageBg}
                          onZoomChange={handleZoomChange}
                        />
                      </View>
                    );
                  }}
                />
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.freezeWrap,
                  {
                    opacity: freezeOpacity,
                    transform: [
                      { translateX: dragX },
                      { translateY: dragY },
                      { scale: dragScale },
                    ],
                  },
                ]}
              >
                {!!freezeUri && (
                  <View style={{ width: PAGE_W, flex: 1, padding: IMG_PAD }}>
                    <View
                      style={[
                        styles.imageClip,
                        { borderRadius: IMG_RADIUS, backgroundColor: imageBg },
                      ]}
                    >
                      <Image
                        source={{ uri: freezeUri }}
                        resizeMode="contain"
                        style={styles.imageFill}
                      />
                    </View>
                  </View>
                )}
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.blurFreezeWrap, { opacity: blurOverlayOpacity }]}
              >
                {!!freezeUri && (
                  <View style={{ width: PAGE_W, flex: 1, padding: IMG_PAD }}>
                    <View
                      style={[
                        styles.imageClip,
                        { borderRadius: IMG_RADIUS, backgroundColor: imageBg },
                      ]}
                    >
                      <Image
                        source={{ uri: freezeUri }}
                        resizeMode="contain"
                        style={styles.imageFill}
                      />

                      <BlurView
                        intensity={22}
                        tint="light"
                        style={StyleSheet.absoluteFill}
                      />

                      <Animated.View
                        style={[
                          styles.blurGlassOverlay,
                          {
                            opacity: blurContentOpacity,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.centerStageWrap,
                  {
                    opacity: stageOpacity,
                    transform: [
                      { translateX: stageX },
                      { translateY: combinedStageY },
                      { scale: stageScale },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={{
                    width: PAGE_W,
                    flex: 1,
                    padding: IMG_PAD,
                    opacity: stageDim,
                  }}
                >
                  <View
                    style={[
                      styles.imageClip,
                      { borderRadius: IMG_RADIUS, backgroundColor: imageBg },
                    ]}
                  >
                    {!!currUri && (
                      <Image
                        source={{ uri: currUri }}
                        resizeMode="contain"
                        style={styles.imageFill}
                      />
                    )}
                  </View>
                </Animated.View>
              </Animated.View>
            </View>
          )}

          {/* Hint: "Swipe up to save to Favorites" */}
          {showHintUI && (
            <View pointerEvents="none" style={styles.hintCol}>
              <SwipeUpIcon width={swipeUpSize} height={swipeUpSize} />
              <Text style={[styles.hintText, { fontSize: hintFont }]}>
                Swipe up to save to Favorites
              </Text>
            </View>
          )}

          {/* Heart icon top-right */}
          {!isGuest && (
            <View pointerEvents="none" style={styles.heartWrap}>
              <HeartIcon
                width={24}
                height={24}
                fill={currentIsSaved ? "#E85A70" : "none"}
                stroke={currentIsSaved ? "#E85A70" : "#E85A70"}
                strokeWidth={1.5}
              />
            </View>
          )}

          {/* Pink "Saved to Selected" pill toast at bottom-center of image */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.savedToast,
              { opacity: savedToastOpacity },
            ]}
          >
            <Text style={styles.savedToastText}>✓  Saved to Selected</Text>
          </Animated.View>
        </View>
      </View>

      {/* Vertical "Selected" path - clip wrapper (fixed position, overflow hidden) */}
      <View
        pointerEvents="none"
        style={[
          styles.selectedPathClip,
          {
            bottom: footerTotalH + 8,
            height: clamp(H * 0.35, 180, 320),
          },
        ]}
      >
        {/* Inner strip slides up from bottom via translateY */}
        <Animated.View
          style={[
            styles.selectedPathWrap,
            {
              opacity: folderContainerOpacity,
              // Strip starts hidden below (translateY = clipHeight), slides up as dragY goes negative
              // dragY is negative, so adding it reduces the translateY toward 0
              transform: [{ translateY: Animated.add(new Animated.Value(clamp(H * 0.35, 180, 320)), dragY) }],
            },
          ]}
        >
          {/* Pink circle with arrow at top */}
          <View style={styles.selectedPathTop}>
            <SwipeUpIcon width={16} height={16} />
          </View>

          {/* Vertical "Selected" text */}
          <View style={styles.selectedPathBody}>
            <Text style={styles.selectedPathText}>Selected</Text>
          </View>

          {/* Small arrow at bottom */}
          <View style={{ marginBottom: 4 }}>
            <SwipeUpIcon width={12} height={12} />
          </View>
        </Animated.View>
      </View>

      {/* "Selected Folder" icon - bottom-right, appears during swipe */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.selectedFolderWrap,
          {
            opacity: folderContainerOpacity,
            bottom: footerTotalH + 12,
          },
        ]}
      >
        <View style={styles.selectedFolderIcon}>
          <SelectedIcon width={28} height={28} />
        </View>
        <Text style={styles.selectedFolderLabel}>Selected Folder</Text>
      </Animated.View>

      {/* Footer */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: cCard,
            borderTopColor: cBorder,
            height: footerTotalH,
            paddingBottom: bottomPad,
            paddingTop: 8,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PreviewBottomAction
            Icon={ShareIcon}
            label="Share"
            onPress={onShare}
            iconSize={barIcon}
            boxW={ACTION_W}
            boxH={ACTION_H}
            colors={{ icon: cText, text: cMuted }}
          />

          {!isGuest && (
            <>
              <View style={{ width: ACTION_GAP }} />
              <PreviewBottomAction
                Icon={DeleteIcon}
                label="Delete"
                onPress={onDelete}
                iconSize={barIcon}
                boxW={ACTION_W}
                boxH={ACTION_H}
                colors={{ icon: cDanger, text: cDanger }}
              />
            </>
          )}
        </View>
      </View>

      {/* ✅ Delete confirm */}
      <ImageDeleteConfirmModal
        visible={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          await doDelete();
        }}
        width={Math.min(W - 48, 320)}
        cText={cText}
        cMuted={cMuted}
      />
    </SafeAreaView>
    </View>
  );
}

