import { useEffect, useMemo, useRef, useState } from "react";

import logo from "../assets/logo.svg";
import logoTitle from "../assets/logo-title.svg";
import backIcon from "../assets/back.svg";

import tickIcon from "../assets/tick2.svg";
import untickIcon from "../assets/untick.svg";
import untickIcon2 from "../assets/untick2.svg";
import deleteIcon from "../assets/delete.svg";
import playIcon from "../assets/play2.svg";

import uploadIcon from "../assets/fastupload.svg";
import pauseIcon from "../assets/pause.svg";
import closeIcon from "../assets/close.svg";
import warningIcon from "../assets/duplicate.svg";

import leftArrowIcon from "../assets/left-arrow.svg";
import rightArrowIcon from "../assets/right-arrow.svg";

export default function AlbumPreviewScreen({
  visible,
  album,
  apiBase,
  weddingId,
  onClose,
  onPhotosUploaded,
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
const [lightboxEntering, setLightboxEntering] = useState(false);
  const [lightboxExiting, setLightboxExiting] = useState(false);
  const [lightboxOriginX, setLightboxOriginX] = useState(50);
  const [lightboxOriginY, setLightboxOriginY] = useState(50);
  const [activePhotoIndex, setActivePhotoIndex] = useState(-1);
  const [isSlideshowRunning, setIsSlideshowRunning] = useState(false);

  const lightboxAnimTimerRef = useRef(null);const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmExiting, setDeleteConfirmExiting] = useState(false);
  const deleteConfirmTimerRef = useRef(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalExiting, setUploadModalExiting] = useState(false);
  const uploadModalTimerRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [duplicateCases, setDuplicateCases] = useState([]);
  const [activeDuplicateKey, setActiveDuplicateKey] = useState("");
  const [duplicateBusyKey, setDuplicateBusyKey] = useState("");

  const [isViewerHovered, setIsViewerHovered] = useState(false);

  const slideshowTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const pauseRequestedRef = useRef(false);
  const duplicateRulesRef = useRef([]);

  const closeDeleteConfirm = () => {
    if (deleteBusy || deleteConfirmExiting) return;
    setDeleteConfirmExiting(true);
    clearTimeout(deleteConfirmTimerRef.current);
    deleteConfirmTimerRef.current = setTimeout(() => {
      setShowDeleteConfirm(false);
      setDeleteConfirmExiting(false);
    }, 300);
  };

  const closeUploadModal = () => {
    if (uploadModalExiting) return;
    setUploadModalExiting(true);
    clearTimeout(uploadModalTimerRef.current);
    uploadModalTimerRef.current = setTimeout(() => {
      setShowUploadModal(false);
      setUploadModalExiting(false);
    }, 290);
  };

  const normalizedApiBase = useMemo(() => {
    const raw = String(apiBase || "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }, [apiBase]);

  const activePhoto =
    activePhotoIndex >= 0 && activePhotoIndex < photos.length
      ? photos[activePhotoIndex]
      : null;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const photoCountLabel = useMemo(() => {
    const count = photos.length;
    return `${count} photo${count === 1 ? "" : "s"}`;
  }, [photos]);

  const previewAlbumTitle = useMemo(() => {
    return (
      String(
        album?.title ||
          album?.name ||
          album?.attributes?.title ||
          album?.attributes?.name ||
          "Album"
      ).trim() || "Album"
    );
  }, [album]);
const dotWindowRef = useRef(0);
const visibleDotIndices = useMemo(() => {
  const total = photos.length;
  if (total === 0) return [];
  if (total <= 5) return Array.from({ length: total }, (_, i) => i);

  let start = dotWindowRef.current;
  if (activePhotoIndex < start) start = activePhotoIndex;
  if (activePhotoIndex > start + 4) start = activePhotoIndex - 4;
  start = Math.max(0, Math.min(start, total - 5));
  dotWindowRef.current = start;

  return Array.from({ length: 5 }, (_, i) => start + i);
}, [photos.length, activePhotoIndex]);
  const totalCount = queue.length;

  const doneCount = useMemo(
    () => queue.filter((x) => x.status === "done").length,
    [queue]
  );

  const uploadingCount = useMemo(
    () =>
      queue.filter(
        (x) =>
          x.status === "checking" ||
          x.status === "uploading" ||
          x.status === "saving" ||
          x.status === "resolving-duplicate"
      ).length,
    [queue]
  );

  const failedCount = useMemo(
    () => queue.filter((x) => x.status === "error").length,
    [queue]
  );

  const totalProgress = useMemo(() => {
    if (!queue.length) return 0;
    const total = queue.reduce((sum, x) => sum + Number(x.progress || 0), 0);
    return Math.round(total / queue.length);
  }, [queue]);

  const totalUploadedBytes = useMemo(() => {
    return queue.reduce((sum, x) => {
      if (x.status === "done") return sum + Number(x.sizeBytes || x.file?.size || 0);
      return sum + Number(x.uploadedBytes || 0);
    }, 0);
  }, [queue]);

  const reportedBytesRef = useRef({ image: 0, video: 0 });
  useEffect(() => {
    if (!onPhotosUploaded) return;
    let imageBytes = 0;
    let videoBytes = 0;
    for (const x of queue) {
      if (x.status !== "done") continue;
      const size = Number(x.sizeBytes || x.file?.size || 0);
      if (getMediaKind(x.file) === "video") videoBytes += size;
      else imageBytes += size;
    }
    const prev = reportedBytesRef.current;
    const deltaImage = imageBytes - prev.image;
    const deltaVideo = videoBytes - prev.video;
    if (deltaImage > 0 || deltaVideo > 0) {
      reportedBytesRef.current = { image: imageBytes, video: videoBytes };
      onPhotosUploaded({ imageBytes: deltaImage, videoBytes: deltaVideo });
    }
  }, [queue, onPhotosUploaded]);

  const activeDuplicateCase = useMemo(() => {
    if (!activeDuplicateKey) return null;
    return duplicateCases.find((x) => x.key === activeDuplicateKey) || null;
  }, [duplicateCases, activeDuplicateKey]);

  const extractedWeddingId = useMemo(() => {
    return (
      weddingId ||
      album?.weddingId ||
      album?.wedding?.id ||
      album?.attributes?.weddingId ||
      album?.attributes?.wedding?.data?.id ||
      ""
    );
  }, [weddingId, album]);

  const fetchPhotos = async () => {
    if (!visible || !album?.id || !normalizedApiBase) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${normalizedApiBase}/photos?albumId=${encodeURIComponent(String(album.id))}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      const raw = await res.text();
      let json = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || "Failed to load album photos.");
      }

      setPhotos(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      console.error("album preview fetch failed", err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    fetchPhotos();
  }, [visible, album?.id, normalizedApiBase]);

  useEffect(() => {
    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isSlideshowRunning || !photos.length || activePhotoIndex < 0) {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
      return;
    }

    slideshowTimerRef.current = setInterval(() => {
      setActivePhotoIndex((prev) => {
        if (!photos.length) return -1;
        const next = prev + 1;
        if (next >= photos.length) {
          setIsSlideshowRunning(false);
          return prev;
        }
        return next;
      });
    }, 2200);

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
    };
  }, [isSlideshowRunning, activePhotoIndex, photos]);

  useEffect(() => {
    if (!visible) {
      setPhotos([]);
      setLoading(false);
      setActivePhotoIndex(-1);
      setIsSlideshowRunning(false);
      setSelectionMode(false);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      setDeleteBusy(false);
      setShowUploadModal(false);
      setQueue([]);
      setIsUploading(false);
      setIsPaused(false);
      setDuplicateCases([]);
      setActiveDuplicateKey("");
      setDuplicateBusyKey("");
      setIsViewerHovered(false);
    }
  }, [visible]);

  useEffect(() => {
    const el = dropRef.current;
    if (!el || !showUploadModal) return;

    const onDragOver = (e) => {
      e.preventDefault();
      el.classList.add("ap-drop--active");
    };

    const onDragLeave = () => {
      el.classList.remove("ap-drop--active");
    };

    const onDrop = (e) => {
      e.preventDefault();
      el.classList.remove("ap-drop--active");
      const files = Array.from(e.dataTransfer.files || []);
      addFiles(files, { autoUpload: true });
    };

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [showUploadModal]);

  useEffect(() => {
    return () => {
      setQueue((prev) => {
        prev.forEach((x) => {
          if (x.preview) {
            try {
              URL.revokeObjectURL(x.preview);
            } catch {}
          }
        });
        return prev;
      });
    };
  }, []);
  useEffect(() => {
  return () => {
    if (lightboxAnimTimerRef.current) {
      clearTimeout(lightboxAnimTimerRef.current);
    }
  };
}, []);

  const toggleTopSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds([]);
      }
      return next;
    });
  };

  const togglePhotoSelected = (photoId) => {
    setSelectedIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      return [...prev, photoId];
    });
  };

const openPhoto = (index, event) => {
  if (selectionMode) return;

  if (event?.currentTarget) {
    const rect = event.currentTarget.getBoundingClientRect();
    setLightboxOriginX(((rect.left + rect.width / 2) / window.innerWidth) * 100);
    setLightboxOriginY(((rect.top + rect.height / 2) / window.innerHeight) * 100);
  } else {
    setLightboxOriginX(50);
    setLightboxOriginY(50);
  }

  if (lightboxAnimTimerRef.current) {
    clearTimeout(lightboxAnimTimerRef.current);
  }

  setActivePhotoIndex(index);
  setLightboxEntering(true);

  lightboxAnimTimerRef.current = setTimeout(() => {
    setLightboxEntering(false);
    lightboxAnimTimerRef.current = null;
  }, 320);
};

const closeLightbox = () => {
  if (lightboxExiting) return;

  if (lightboxAnimTimerRef.current) {
    clearTimeout(lightboxAnimTimerRef.current);
    lightboxAnimTimerRef.current = null;
  }

  setIsSlideshowRunning(false);
  setIsViewerHovered(false);
  setLightboxEntering(false);
  setLightboxExiting(true);

  lightboxAnimTimerRef.current = setTimeout(() => {
    setActivePhotoIndex(-1);
    setLightboxExiting(false);
    lightboxAnimTimerRef.current = null;
  }, 300);
};

 const showPrev = () => {
  if (!photos.length) return;
  if (lightboxAnimTimerRef.current) clearTimeout(lightboxAnimTimerRef.current);
  setActivePhotoIndex((prev) => Math.max(0, prev - 1));
};
const showNext = () => {
  if (!photos.length) return;
  if (lightboxAnimTimerRef.current) clearTimeout(lightboxAnimTimerRef.current);
  setActivePhotoIndex((prev) => Math.min(photos.length - 1, prev + 1));
};

  const toggleSlideshow = () => {
    if (!photos.length) return;

    if (activePhotoIndex < 0) {
      setActivePhotoIndex(0);
      setIsSlideshowRunning(true);
      return;
    }

    setIsSlideshowRunning((prev) => !prev);
  };

  const deleteSelectedPhotos = async () => {
    if (!selectedIds.length || !normalizedApiBase || deleteBusy) return;

    try {
      setDeleteBusy(true);

      for (const id of selectedIds) {
        const res = await fetch(`${normalizedApiBase}/photos/${id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        });

        const raw = await res.text();
        let json = {};
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {
          json = {};
        }

        if (!res.ok) {
          throw new Error(
            json?.error?.message || json?.message || `Failed to delete photo ${id}.`
          );
        }
      }

      setShowDeleteConfirm(false);
      setSelectedIds([]);
      setSelectionMode(false);
      await fetchPhotos();
    } catch (err) {
      console.error("deleteSelectedPhotos failed", err);
      alert(String(err?.message || "Delete failed."));
    } finally {
      setDeleteBusy(false);
    }
  };

  const getMediaKind = (fileOrItem) => {
    const file = fileOrItem?.file || fileOrItem;
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();

    if (type.startsWith("video/")) return "video";
    if (type.startsWith("image/")) return "image";
    if (/\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name)) return "video";
    return "image";
  };

  const addFiles = (files, options = {}) => {
    const { autoUpload = false } = options;

    const valid = (files || []).filter((f) => {
      const t = (f.type || "").toLowerCase();
      return (
        t.startsWith("image/") ||
        t.startsWith("video/") ||
        /\.(jpg|jpeg|png|webp|heic|mp4|mov|avi|mkv|webm|m4v)$/i.test(f.name)
      );
    });

    const mapped = valid.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      file,
      preview: getMediaKind(file) === "image" ? URL.createObjectURL(file) : "",
      status: "ready",
      progress: 0,
      error: "",
      uploadedKey: "",
      serverId: "",
      sizeBytes: Number(file.size || 0),
      uploadedBytes: 0,
      checksum: "",
      duplicateInfo: null,
    }));

    if (!mapped.length) return;

    setQueue((prev) => [...mapped, ...prev]);

    if (autoUpload) {
      setTimeout(() => {
        uploadAll(mapped);
      }, 0);
    }
  };

  const setItemPatch = (id, patch) => {
    setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeDuplicateCase = (key) => {
    setDuplicateCases((prev) => prev.filter((x) => x.key !== key));
    setActiveDuplicateKey((prev) => (prev === key ? "" : prev));
  };

  const getExt = (file) => {
    const name = String(file?.name || "");
    const ext = name.includes(".") ? name.split(".").pop() : "";
    return String(ext || "").toLowerCase();
  };

  const normalizeMime = (file) => {
    const given = String(file?.type || "").trim().toLowerCase();
    if (given) return given;

    const ext = getExt(file);
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "heic") return "image/heic";
    if (ext === "mp4") return "video/mp4";
    if (ext === "mov") return "video/quicktime";
    if (ext === "webm") return "video/webm";
    if (ext === "mkv") return "video/x-matroska";
    if (ext === "avi") return "video/x-msvideo";
    if (ext === "m4v") return "video/x-m4v";
    return "image/jpeg";
  };

  const hashFileSHA256 = async (file) => {
    if (!file) return "";
    try {
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.error("hashFileSHA256 error:", err);
      return "";
    }
  };

  const ensureItemChecksum = async (item) => {
    if (item?.checksum) return String(item.checksum);
    const checksum = await hashFileSHA256(item?.file);
    if (checksum) {
      setItemPatch(item.id, { checksum });
    }
    return checksum;
  };

  const xhrPutFile = (uploadUrl, file, contentType, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", contentType);

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const total = Number(evt.total || file.size || 0);
        const loaded = Number(evt.loaded || 0);
        const raw = total > 0 ? Math.round((loaded / total) * 100) : 0;
        onProgress?.({
          percent: Math.max(1, Math.min(100, raw)),
          loaded,
          total,
        });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true, status: xhr.status });
        } else {
          reject(new Error(`S3 upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error("S3 upload failed."));
      xhr.onabort = () => reject(new Error("S3 upload aborted."));
      xhr.send(file);
    });

  const presignOnly = async (file) => {
    const mimeType = normalizeMime(file);
    const originalFileName = String(file.name || `upload.${getExt(file) || "jpg"}`);

    const bodyData = {
      albumId: String(album?.id),
      originalFileName,
      mimeType,
    };

    if (extractedWeddingId) {
      bodyData.weddingId = String(extractedWeddingId);
    }

    const presignRes = await fetch(`${normalizedApiBase}/photos/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(bodyData),
    });

    const presignRaw = await presignRes.text();
    let presignJson = {};
    try {
      presignJson = presignRaw ? JSON.parse(presignRaw) : {};
    } catch {
      presignJson = {};
    }

    if (!presignRes.ok) {
      throw new Error(presignJson?.error?.message || presignJson?.message || "Presign failed.");
    }

    const uploadUrl = presignJson?.data?.uploadUrl;
    const key = presignJson?.data?.key;

    if (!uploadUrl || !key) {
      throw new Error("Presign missing uploadUrl/key.");
    }

    return { uploadUrl, key, mimeType };
  };

  const uploadBinaryToS3 = async (item, savingStatus = "saving") => {
    const file = item?.file;
    if (!file) throw new Error("Missing file.");
    if (!normalizedApiBase) throw new Error("Missing API base URL.");
    if (!album?.id) throw new Error("Missing album id.");

    const { uploadUrl, key, mimeType } = await presignOnly(file);

    await xhrPutFile(uploadUrl, file, mimeType, ({ percent, loaded }) => {
      const mapped = Math.max(10, Math.min(96, percent));
      setItemPatch(item.id, {
        progress: mapped,
        uploadedBytes: Number(loaded || 0),
        status: "uploading",
      });
    });

    setItemPatch(item.id, {
      progress: 97,
      uploadedBytes: Number(file.size || 0),
      status: savingStatus,
    });

    return { key, mimeType };
  };

  const savePhotoRecord = async (key, item, checksum) => {
    const file = item?.file;

    const saveRes = await fetch(`${normalizedApiBase}/photos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        data: {
          image_url: key,
          album: String(album?.id),
          size_bytes: Number(file?.size || 0),
          file_name: String(file?.name || ""),
          checksum: String(checksum || ""),
          duplicate_group: String(checksum || ""),
          media_type: getMediaKind(file),
          mime_type: normalizeMime(file),
        },
      }),
    });

    const saveRaw = await saveRes.text();
    let saveJson = {};
    try {
      saveJson = saveRaw ? JSON.parse(saveRaw) : {};
    } catch {
      saveJson = {};
    }

    if (!saveRes.ok) {
      throw new Error(saveJson?.error?.message || saveJson?.message || "Saving photo failed.");
    }

    return saveJson;
  };

  const checkDuplicateBeforeUpload = async (item) => {
    const file = item?.file;
    if (!file) throw new Error("Missing file.");
    const checksum = await ensureItemChecksum(item);

    if (!extractedWeddingId) {
      return {
        duplicate: false,
        data: null,
        checksum,
      };
    }

    const checkRes = await fetch(`${normalizedApiBase}/photos/check-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        albumId: String(album?.id),
        weddingId: String(extractedWeddingId),
        fileName: String(file.name || ""),
        checksum: String(checksum || ""),
        size_bytes: Number(file.size || 0),
      }),
    });

    const checkRaw = await checkRes.text();
    let checkJson = {};
    try {
      checkJson = checkRaw ? JSON.parse(checkRaw) : {};
    } catch {
      checkJson = {};
    }

    if (!checkRes.ok) {
      throw new Error(checkJson?.error?.message || checkJson?.message || "Duplicate check failed.");
    }

    return {
      duplicate: !!checkJson?.duplicate,
      data: checkJson?.data || null,
      checksum,
    };
  };

  const getDuplicateRuleValue = (duplicateData, fallbackFileName = "") => {
    const matchType = String(duplicateData?.matchType || "").trim();
    if (matchType === "checksum") {
      return String(
        duplicateData?.existingPhoto?.checksum || duplicateData?.incomingPhoto?.checksum || ""
      ).trim();
    }
    return String(
      duplicateData?.existingPhoto?.fileName ||
        duplicateData?.incomingPhoto?.fileName ||
        fallbackFileName
    ).trim();
  };

  const findMatchingDuplicateRule = (duplicateData, fallbackFileName = "") => {
    const matchType = String(duplicateData?.matchType || "").trim();
    const value = getDuplicateRuleValue(duplicateData, fallbackFileName);
    if (!matchType || !value) return null;
    return (
      duplicateRulesRef.current.find(
        (rule) => rule?.matchType === matchType && String(rule?.value || "") === String(value)
      ) || null
    );
  };

  const performNormalUpload = async (item, checksum) => {
    const file = item?.file;

    setItemPatch(item.id, {
      status: "uploading",
      progress: 5,
      error: "",
      uploadedBytes: 0,
    });

    const { key } = await uploadBinaryToS3(item, "saving");
    const saveJson = await savePhotoRecord(key, item, checksum);

    setItemPatch(item.id, {
      status: "done",
      progress: 100,
      uploadedKey: key,
      serverId: String(saveJson?.data?.id || ""),
      uploadedBytes: Number(file?.size || 0),
      error: "",
      duplicateInfo: null,
    });
  };

  const enqueueDuplicateCase = (item, duplicateData, checksum) => {
    const key = `dup_${item.id}`;
    const payload = {
      key,
      itemId: item.id,
      selectedAlbumId: String(album?.id || ""),
      itemPreview: item.preview,
      fileName: String(item?.file?.name || ""),
      fileSize: Number(item?.file?.size || 0),
      checksum: String(checksum || ""),
      duplicateData,
    };

    setItemPatch(item.id, {
      status: "duplicate",
      progress: 0,
      error: "",
      checksum: String(checksum || ""),
      duplicateInfo: payload,
    });

    setDuplicateCases((prev) => {
      const exists = prev.some((x) => x.key === key);
      if (exists) return prev;
      return [...prev, payload];
    });
  };

  const resolveDuplicateSkip = async (duplicateCase) => {
    const existingPhotoId = String(duplicateCase?.duplicateData?.existingPhoto?.id || duplicateCase?.duplicateData?.existingPhoto?._id || "").trim();
    if (!existingPhotoId) throw new Error("Existing duplicate photo not found.");

    const res = await fetch(`${normalizedApiBase}/photos/resolve-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        action: "skip",
        existingPhotoId,
      }),
    });

    const raw = await res.text();
    let json = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = {};
    }

    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Skip duplicate failed.");
    }
  };

  const resolveDuplicateReplace = async (duplicateCase) => {
    const item = queue.find((x) => x.id === duplicateCase?.itemId);
    if (!item?.file) throw new Error("Missing duplicate upload file.");

    const existingPhotoId = String(duplicateCase?.duplicateData?.existingPhoto?.id || duplicateCase?.duplicateData?.existingPhoto?._id || "").trim();
    const checksum = String(duplicateCase?.checksum || item?.checksum || "");

    if (!existingPhotoId) throw new Error("Existing duplicate photo not found.");
    if (!album?.id) throw new Error("Album missing.");

    setItemPatch(item.id, {
      status: "resolving-duplicate",
      progress: 5,
      error: "",
    });

    const { key } = await uploadBinaryToS3(item, "resolving-duplicate");

    const res = await fetch(`${normalizedApiBase}/photos/resolve-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        action: "replace",
        existingPhotoId,
        newPhoto: {
          image_url: key,
          album: String(album?.id),
          size_bytes: Number(item?.file?.size || 0),
          file_name: String(item?.file?.name || ""),
          checksum: String(checksum || ""),
          duplicate_group: String(checksum || ""),
          media_type: getMediaKind(item?.file),
          mime_type: normalizeMime(item?.file),
        },
      }),
    });

    const raw = await res.text();
    let json = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = {};
    }

    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Replace duplicate failed.");
    }

    setItemPatch(item.id, {
      status: "done",
      progress: 100,
      uploadedKey: key,
      uploadedBytes: Number(item?.file?.size || 0),
      error: "",
      duplicateInfo: null,
    });
  };

  const handleDuplicateDecision = async (decision, duplicateCase, applyToAll = false) => {
    if (!duplicateCase) return;

    try {
      setDuplicateBusyKey(duplicateCase.key);

      if (applyToAll) {
        const matchType = String(duplicateCase?.duplicateData?.matchType || "").trim();
        const value = getDuplicateRuleValue(
          duplicateCase?.duplicateData,
          duplicateCase?.fileName || ""
        );

        if (matchType && value) {
          const nextRules = [...duplicateRulesRef.current];
          const existingIdx = nextRules.findIndex(
            (r) => r?.matchType === matchType && String(r?.value || "") === String(value)
          );

          const nextRule = { matchType, value, action: decision };
          if (existingIdx >= 0) nextRules[existingIdx] = nextRule;
          else nextRules.push(nextRule);

          duplicateRulesRef.current = nextRules;
        }
      }

      if (decision === "skip") {
        await resolveDuplicateSkip(duplicateCase);
        setItemPatch(duplicateCase.itemId, {
          status: "skipped",
          progress: 0,
          error: "",
          duplicateInfo: null,
          uploadedBytes: 0,
        });
      } else {
        await resolveDuplicateReplace(duplicateCase);
      }

      removeDuplicateCase(duplicateCase.key);
      await fetchPhotos();

      setTimeout(() => {
        uploadAll();
      }, 0);
    } catch (err) {
      const msg = String(err?.message || "Duplicate resolution failed.");
      setItemPatch(duplicateCase.itemId, {
        status: "error",
        progress: 0,
        error: msg,
      });
    } finally {
      setDuplicateBusyKey("");
    }
  };

  const uploadOneToS3 = async (item) => {
    const file = item?.file;
    if (!file) throw new Error("Missing file.");
    if (!normalizedApiBase) throw new Error("Missing API base URL.");
    if (!album?.id) throw new Error("Missing album id.");

    setItemPatch(item.id, {
      status: "checking",
      progress: 2,
      error: "",
      uploadedBytes: 0,
    });

    const duplicateCheck = await checkDuplicateBeforeUpload(item);

    if (duplicateCheck?.duplicate) {
      const autoRule = findMatchingDuplicateRule(duplicateCheck.data, file?.name);

      if (autoRule?.action === "skip") {
        await resolveDuplicateSkip({
          key: `dup_${item.id}`,
          itemId: item.id,
          selectedAlbumId: String(album?.id || ""),
          fileName: String(file?.name || ""),
          checksum: duplicateCheck.checksum,
          duplicateData: duplicateCheck.data,
        });

        setItemPatch(item.id, {
          status: "skipped",
          progress: 0,
          error: "",
          checksum: duplicateCheck.checksum,
          duplicateInfo: null,
        });
        return { duplicateStopped: false, skipped: true };
      }

      if (autoRule?.action === "replace") {
        await resolveDuplicateReplace({
          key: `dup_${item.id}`,
          itemId: item.id,
          selectedAlbumId: String(album?.id || ""),
          fileName: String(file?.name || ""),
          checksum: duplicateCheck.checksum,
          duplicateData: duplicateCheck.data,
        });
        return { duplicateStopped: false, replaced: true };
      }

      enqueueDuplicateCase(item, duplicateCheck.data, duplicateCheck.checksum);
      return { duplicateStopped: true };
    }

    await performNormalUpload(item, duplicateCheck.checksum);
    return { duplicateStopped: false };
  };

  const uploadAll = async (itemsOverride) => {
    if (pauseRequestedRef.current) return;
    if (isUploading && !Array.isArray(itemsOverride)) return;
    if (duplicateCases.length && !Array.isArray(itemsOverride)) return;

    const itemsToUpload = Array.isArray(itemsOverride) ? itemsOverride : queue;

    if (!itemsToUpload.length) {
      fileInputRef.current?.click();
      return;
    }

    if (!album?.id) {
      console.error("Album ID missing.");
      return;
    }

    setIsPaused(false);
    pauseRequestedRef.current = false;
    setIsUploading(true);

    try {
      for (const item of itemsToUpload) {
        if (pauseRequestedRef.current) break;

        const latest = queue.find((q) => q.id === item.id) || item;
        if (
          latest.status === "done" ||
          latest.status === "skipped" ||
          latest.status === "duplicate"
        ) {
          continue;
        }

        try {
          const result = await uploadOneToS3(latest);
          if (result?.duplicateStopped) {
            break;
          }
        } catch (e) {
          setItemPatch(latest.id, {
            status: "error",
            progress: 0,
            error: String(e?.message || "Upload failed. Try again."),
            uploadedBytes: 0,
          });
        }
      }

      await fetchPhotos();
    } finally {
      setIsUploading(false);
      setIsPaused(false);
      pauseRequestedRef.current = false;
    }
  };

  const retryOne = async (item) => {
    if (isUploading) return;

    const duplicateCase = duplicateCases.find((x) => x.itemId === item?.id);
    if (duplicateCase) {
      setActiveDuplicateKey(duplicateCase.key);
      return;
    }

    if (!album?.id) {
      console.error("Album missing.");
      return;
    }

    setIsUploading(true);

    try {
      await uploadOneToS3(item);
      await fetchPhotos();
    } catch (e) {
      setItemPatch(item.id, {
        status: "error",
        progress: 0,
        error: String(e?.message || "Upload failed. Try again."),
        uploadedBytes: 0,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pauseAll = () => {
    if (!isUploading) return;
    pauseRequestedRef.current = true;
    setIsPaused(true);
  };

  const cancelAll = () => {
    if (isUploading) {
      pauseRequestedRef.current = true;
      setIsPaused(true);
    }

    setDuplicateCases([]);
    setActiveDuplicateKey("");
    setDuplicateBusyKey("");
    duplicateRulesRef.current = [];

    setQueue((prev) => {
      prev.forEach((x) => {
        if (x.preview) {
          try {
            URL.revokeObjectURL(x.preview);
          } catch {}
        }
      });
      return [];
    });
  };

  const removeOne = (id) => {
    const dup = duplicateCases.find((x) => x.itemId === id);
    if (dup) {
      removeDuplicateCase(dup.key);
    }

    setQueue((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found?.preview) {
        try {
          URL.revokeObjectURL(found.preview);
        } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!visible) return;

      if (activePhoto) {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") showPrev();
        if (e.key === "ArrowRight") showNext();
        return;
      }

      if (e.key === "Escape") {
        if (activeDuplicateCase) setActiveDuplicateKey("");
        else if (showUploadModal) closeUploadModal();
        else if (showDeleteConfirm) closeDeleteConfirm();
        else onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, activePhoto, showDeleteConfirm, showUploadModal, activeDuplicateCase, photos]);

  if (!visible) return null;

  return (
    <>
      <div className="ap-overlay">
        <div className="ap-shell">

          {/* Fixed top navbar */}
          <div className="ap-fixedNav">
            {/* Row 1: Logo only */}
            <div className="ap-navLogoRow">
              <div className="ap-brand">
                <img src={logo} alt="Us Forever" className="ap-logo" />
                <img src={logoTitle} alt="Us Forever" className="ap-logoTitle" />
              </div>
            </div>

            {/* Row 2: Back + Title + Controls */}
            <div className="ap-fixedNavInner">
              <div className="ap-brandWrap">
                <button type="button" className="ap-backBtn" onClick={onClose}>
                  <img src={backIcon} alt="Back" />
                </button>
              </div>

              <div className="ap-titleBlock">
                <h2 className="ap-title">{previewAlbumTitle}</h2>
                <div className="ap-subtitle">{photoCountLabel}</div>
              </div>

              <div className="ap-topRightStack">
                <button
                  type="button"
                  className="ap-slideshowBtn"
                  onClick={toggleSlideshow}
                  disabled={!photos.length}
                >
                  <img
                    src={isSlideshowRunning ? pauseIcon : playIcon}
                    alt=""
                    className="ap-playIconImg"
                  />
                  <span>{isSlideshowRunning ? "Pause Slideshow" : "Start Slideshow"}</span>
                </button>

                <button
                  type="button"
                  className="ap-topTickBtn"
                  onClick={toggleTopSelectionMode}
                  disabled={!photos.length}
                  aria-label={selectionMode ? "Disable selection" : "Enable selection"}
                >
                  <img
                    src={selectionMode ? untickIcon : tickIcon}
                    alt=""
                    className="ap-topTickIcon"
                  />
                </button>
              </div>
            </div>{/* ap-fixedNavInner */}
          </div>{/* ap-fixedNav */}

          <div className="ap-gridWrap">
            {loading ? (
              <div className="ap-empty">Loading photos...</div>
            ) : photos.length === 0 ? (
              <div className="ap-empty">No photos found in this album</div>
            ) : (
              <div className="ap-grid">
                {photos.map((item, index) => {
                  const isSelected = selectedSet.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`ap-card ${isSelected ? "ap-card--selected" : ""}`}
                      style={{ animationDelay: `${Math.min(index * 35, 600)}ms` }}
                      onClick={(e) => openPhoto(index, e)}
                    >
                      <img
                        src={item.uri}
                        alt={item.fileName || `Photo ${item.id}`}
                        className="ap-image"
                        loading="lazy"
                      />

                      {selectionMode ? (
                        <button
                          type="button"
                          className={`ap-cardTick ${isSelected ? "ap-cardTick--selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelected(item.id);
                          }}
                        >
                          <span className="ap-cardTickBg">
                            <img
                              src={isSelected ? tickIcon : untickIcon2}
                              alt={isSelected ? "Selected" : "Not selected"}
                            />
                          </span>
                        </button>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectionMode ? (
            <div className="ap-bottomDeleteWrap">
              <button
                type="button"
                className="ap-bottomDeleteBtn"
                onClick={() => {
                  if (!selectedIds.length) return;
                  setShowDeleteConfirm(true);
                }}
              >
                <img src={deleteIcon} alt="" className="ap-bottomDeleteIcon" />
                <span className="ap-bottomDeleteText">Delete</span>
              </button>
            </div>
          ) : (
            <div className="ap-uploadFloatWrap">
              <button
                type="button"
                className="ap-uploadFloatBtn"
                onClick={() => setShowUploadModal(true)}
              >
                <img src={uploadIcon} alt="" className="ap-uploadFloatIcon" />
                <span className="ap-uploadFloatText">Upload Data</span>
              </button>
            </div>
          )}
        </div>
      </div>
{activePhoto ? (
  <div
    className={`ap-lightbox ${lightboxExiting ? "ap-lightbox--exiting" : lightboxEntering ? "ap-lightbox--entering" : "ap-lightbox--entered"}`}
    onClick={closeLightbox}
    onMouseLeave={() => setIsViewerHovered(false)}
    onMouseMove={(e) => {
      const screenWidth = window.innerWidth;
      const x = e.clientX;
      const edgeZone = 120;

      if (x < edgeZone || x > screenWidth - edgeZone) {
        setIsViewerHovered(true);
      } else {
        setIsViewerHovered(false);
      }
    }}
  >
        <div className="ap-lightboxTopFixed" onClick={(e) => e.stopPropagation()}>
  <button
    type="button"
    className="ap-lightboxBack"
    onClick={closeLightbox}
    aria-label="Back"
  >
    <img src={backIcon} alt="Back" />
  </button>

  <div className="ap-lightboxAlbumTag">{previewAlbumTitle}</div>

  <button
    type="button"
    className="ap-lightboxSelectBtn"
    onClick={() => {
      setSelectionMode(true);
      closeLightbox();
    }}
    aria-label="Select photos"
  >
    <img src={tickIcon} alt="Select" className="ap-lightboxSelectIcon" />
  </button>
</div>

          {photos.length > 1 ? (
            <button
              type="button"
              className={`ap-nav ap-nav--left ${isViewerHovered ? "ap-nav--show" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
            >
              <img src={leftArrowIcon} alt="Previous" />
            </button>
          ) : null}

          <div className="ap-lightboxInner" onClick={(e) => e.stopPropagation()}>
  <img
  src={activePhoto.uri}
  alt={activePhoto.fileName || "Preview"}
  style={{ transformOrigin: `${lightboxOriginX}% ${lightboxOriginY}%` }}
  className={`ap-lightboxImage ${
    isViewerHovered ? "ap-lightboxImage--active" : ""
  } ${lightboxExiting ? "ap-lightboxImage--exiting" : lightboxEntering ? "ap-lightboxImage--entering" : "ap-lightboxImage--entered"}`}
/>

   {photos.length > 1 ? (
  <div className="ap-lightboxDots" onClick={(e) => e.stopPropagation()}>
    {visibleDotIndices.map((index) => (
      <button
        key={index}
        type="button"
        className={`ap-lightboxDot ${index === activePhotoIndex ? "ap-lightboxDot--active" : ""}`}
        onClick={() => setActivePhotoIndex(index)}
        aria-label={`Go to photo ${index + 1}`}
      />
    ))}
  </div>
) : null}
          </div>

          {photos.length > 1 ? (
            <button
              type="button"
              className={`ap-nav ap-nav--right ${isViewerHovered ? "ap-nav--show" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
            >
              <img src={rightArrowIcon} alt="Next" />
            </button>
          ) : null}
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div
          className={`ap-deleteOverlay${deleteConfirmExiting ? " ap-deleteOverlay--out" : ""}`}
          onClick={closeDeleteConfirm}
        >
          <div
            className={`ap-deleteModal${deleteConfirmExiting ? " ap-deleteModal--out" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ap-deleteClose"
              onClick={closeDeleteConfirm}
            >
              ×
            </button>

            <div className="ap-deleteTitle">Delete Selected Items</div>

            <button
              type="button"
              className="ap-deletePrimary"
              onClick={deleteSelectedPhotos}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </button>

            <button
              type="button"
              className="ap-deleteGhost"
              onClick={closeDeleteConfirm}
              disabled={deleteBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showUploadModal ? (
        <div
          className={`ap-uploadModalOverlay${uploadModalExiting ? " ap-uploadModalOverlay--out" : ""}`}
          onClick={closeUploadModal}
        >
          <div
            className={`ap-uploadModalSheet${uploadModalExiting ? " ap-uploadModalSheet--out" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ap-uploadModalClose"
              onClick={closeUploadModal}
            >
              <img src={closeIcon} alt="Close" />
            </button>

            <div className="ap-uploadModalGrid">
              <div className="ap-dropCard">
                <div className="ap-drop" ref={dropRef}>
                  <div className="ap-dropIcon" aria-hidden="true">
                    <img src={uploadIcon} alt="upload" />
                  </div>

                  <div className="ap-dropTitle">Drop your photos here</div>
                  <div className="ap-dropSub">or click to browse</div>

                  <button
                    className="ap-btn-primary ap-uploadBtnModal"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (!queue.length) {
                        fileInputRef.current?.click();
                        return;
                      }

                      uploadAll();
                    }}
                  >
                    {isUploading ? "UPLOADING..." : "UPLOAD"}
                  </button>

                  <div className="ap-dropNote">
                    Supports JPG, PNG, RAW formats • Up to 50MB per file
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.heic,.mp4,.mov,.avi,.mkv,.webm,.m4v,image/*,video/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    addFiles(files, { autoUpload: true });
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </div>

              <div className="ap-queue">
                <div className="ap-queueTop">
                  <div className="ap-queueTitle">Upload Progress</div>
                </div>

                {!!queue.length && (
                  <div className="ap-overall">
                    <div className="ap-overallTopLine">
                      <div className="ap-overallMeta">
                        <div className="ap-overallTitle">Upload Progress</div>
                        <div className="ap-overallSub">
                          {doneCount}/{totalCount} complete • {uploadingCount} uploading
                          {failedCount ? ` • ${failedCount} failed` : ""}
                          {isPaused ? " • paused" : ""}
                        </div>
                      </div>

                      <div className="ap-overallActions">
                        <button
                          type="button"
                          className="ap-iconMini"
                          onClick={pauseAll}
                          disabled={!isUploading}
                          title="Pause all"
                        >
                          <img src={pauseIcon} alt="Pause" />
                          <span>Pause All</span>
                        </button>

                        <button
                          type="button"
                          className="ap-iconMini ap-iconMini--ghost"
                          onClick={cancelAll}
                          title="Cancel all"
                        >
                          <img src={closeIcon} alt="Cancel" />
                          <span>Cancel All</span>
                        </button>
                      </div>
                    </div>

                    <div className="ap-overallBar">
                      <div
                        className="ap-overallBarFill"
                        style={{ width: `${Math.max(2, totalProgress)}%` }}
                      />
                    </div>

                    <div className="ap-overallFoot">
                      <span>{fmtBytes(totalUploadedBytes)} uploaded</span>
                      <span>
                        {fmtBytes(queue.reduce((s, x) => s + Number(x.sizeBytes || 0), 0))} total
                      </span>
                    </div>
                  </div>
                )}

                {!!queue.length && <div className="ap-uploadingFilesTitle">Uploading Files</div>}

                {!queue.length ? (
                  <div className="ap-emptyWrap2">
                    <div className="ap-emptyTitle2">No files uploaded yet</div>
                    <div className="ap-emptySub2">
                      Files you add will appear here with their progress
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="ap-list">
                      {queue.map((x) => (
                        <QueueRow
                          key={x.id}
                          item={x}
                          disabled={isUploading}
                          onRetry={() => retryOne(x)}
                          onRemove={() => removeOne(x.id)}
                          closeIcon={closeIcon}
                          pauseIcon={pauseIcon}
                        />
                      ))}
                    </div>

                    {!!duplicateCases.length && (
                      <button
                        type="button"
                        className="ap-dupBanner"
                        onClick={() => {
                          const firstDup = duplicateCases[0];
                          if (firstDup?.key) {
                            setActiveDuplicateKey(firstDup.key);
                          }
                        }}
                      >
                        <span className="ap-dupBannerIcon">!</span>
                        <span className="ap-dupBannerText">
                          View Duplicate Detection (Demo)
                          {duplicateCases.length > 1 ? ` (${duplicateCases.length})` : ""}
                        </span>
                      </button>
                    )}

                    {doneCount > 0 && (
                      <button
                        type="button"
                        className="ap-viewAlbumBtn"
                        onClick={() => {
                          closeUploadModal();
                          fetchPhotos();
                        }}
                      >
                        View Full Album →
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeDuplicateCase ? (
        <DuplicateDetectionModal
          duplicateCase={activeDuplicateCase}
          onClose={() => setActiveDuplicateKey("")}
          onSkipThis={() => handleDuplicateDecision("skip", activeDuplicateCase, false)}
          onReplaceThis={() => handleDuplicateDecision("replace", activeDuplicateCase, false)}
          onSkipAll={() => handleDuplicateDecision("skip", activeDuplicateCase, true)}
          onReplaceAll={() => handleDuplicateDecision("replace", activeDuplicateCase, true)}
          isBusy={duplicateBusyKey === activeDuplicateCase.key}
          closeIcon={closeIcon}
          warningIcon={warningIcon}
        />
      ) : null}

      <style>{`
        @keyframes ap-overlayEnter{
          from{opacity:0;}
          to{opacity:1;}
        }
        @keyframes ap-shellEnter{
          from{opacity:0;transform:translateY(24px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes ap-cardEnter{
          from{opacity:0;transform:scale(0.92) translateY(10px);}
          to{opacity:1;transform:scale(1) translateY(0);}
        }

        .ap-overlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.72);
          z-index:5000;
          padding:0;
          overflow:auto;
          animation:ap-overlayEnter 300ms cubic-bezier(0,0,0.2,1) both;
        }

        .ap-shell{
          width:100%;
          min-height:100vh;
          margin:0;
          background:#f5f5f5;
          padding-top:0;
          padding-bottom:30px;
          padding-left:0;
          padding-right:0;
          box-sizing:border-box;
          position:relative;
          animation:ap-shellEnter 350ms cubic-bezier(0,0,0.2,1) both;
        }

        .ap-fixedNav{
          position:sticky;
          top:0;
          z-index:5100;
          background:#f5f5f5;
          padding:36px 100px 24px;
          box-sizing:border-box;
          border-bottom:none;
        }

        .ap-navLogoRow{
          display:flex;
          align-items:center;
          margin-bottom:28px;
        }

        .ap-fixedNavInner{
          display:grid;
          grid-template-columns:1fr auto 1fr;
          align-items:center;
        }

        .ap-gridWrap{
          padding:24px 100px 30px;
          box-sizing:border-box;
        }

        .ap-headerBar{
          display:none;
        }

        .ap-brandWrap{
          display:flex;
          align-items:center;
          gap:16px;
        }

        .ap-backBtn{
          width:28px;
          height:28px;
          border:none;
          background:transparent;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:0;
         
        }

        .ap-backBtn img{
          width:16px;
          height:16px;
          object-fit:contain;
        }

        .ap-brand{
          display:flex;
          align-items:center;
          gap:8px;
        }

        .ap-logo{
          width:35px;
          height:35px;
          object-fit:contain;
        }

        .ap-logoTitle{
          height:25px;
          object-fit:contain;
        }

        .ap-topRow{
          display:none;
        }

        .ap-titleBlock{
          text-align:center;
        }

        .ap-title{
          margin:0;
          font-size:32px;
          line-height:1.2;
          font-weight:800;
          color:#ff4f87;
        }

        .ap-subtitle{
          margin-top:3px;
          font-size:12px;
          color:#818181;
          font-weight:500;
        }

        .ap-topRightStack{
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          gap:10px;
        }

        .ap-slideshowBtn{
          height:38px;
          padding:0 16px;
          border:1px solid rgba(0,0,0,0.22);
          border-radius:10px;
          background:#f7f7f7;
          color:#4f4f4f;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:7px;
        }

        .ap-slideshowBtn:disabled{
          opacity:0.5;
          cursor:not-allowed;
        }

        .ap-playIconImg{
          width:12px;
          height:12px;
          object-fit:contain;
          display:block;
        }

        .ap-topTickBtn{
          width:24px;
          height:24px;
          border:none;
          background:transparent;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }

        .ap-topTickBtn:disabled{
          opacity:0.5;
          cursor:not-allowed;
        }

        .ap-topTickIcon{
          width:18px;
          height:18px;
          object-fit:contain;
          display:block;
        }

        .ap-grid{
          display:grid;
          grid-template-columns:repeat(6, minmax(0, 1fr));
          column-gap:20px;
          row-gap:20px;
        }

        .ap-card{
          position:relative;
          width:100%;
          aspect-ratio:1 / 0.78;
          border:none;
          border-radius:7px;
          overflow:hidden;
          background:#ddd;
          padding:0;
          cursor:pointer;
          box-shadow:none;
          animation:ap-cardEnter 380ms cubic-bezier(0,0,0.2,1) both;
        }

        .ap-card--selected{
          outline:2px solid #ef6a8a;
          outline-offset:0;
        }

        .ap-image{
          width:100%;
          height:100%;
          object-fit:contain;
          display:block;
          background:#000;
        }

        .ap-cardTick{
          position:absolute;
          top:6px;
          right:6px;
          border:none;
          background:transparent;
          padding:0;
          cursor:pointer;
          z-index:2;
        }

        .ap-cardTickBg{
          width:22px;
          height:22px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .ap-cardTickBg img{
          width:15px;
          height:15px;
          object-fit:contain;
          display:block;
        }

        .ap-cardTick--selected .ap-cardTickBg{
          background:rgba(239,106,138,0.22);
        }

        .ap-empty{
          min-height:340px;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#888;
          font-size:15px;
          font-weight:500;
        }

        .ap-bottomDeleteWrap{
          position:fixed;
          right:120px;
          bottom:100px;
          z-index:30;
        }

        .ap-bottomDeleteBtn{
          min-width:70px;
          min-height:70px;
          border:none;
          color:#DE0101;
          background:#ECEBEC;
          border-radius:14px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:4px;
          cursor:pointer;
          box-shadow:0 8px 20px rgba(0,0,0,0.12);
        }

        .ap-bottomDeleteIcon{
          width:25px;
          height:25px;
          object-fit:contain;
          display:block;
          margin-top:4px;
        }

        .ap-bottomDeleteText{
          margin-top:3px;
          font-size:11px;
          line-height:1;
          color:#DE0101;
          font-weight:500;
          display:block;
        }

        .ap-uploadFloatWrap{
          position:fixed;
          right:120px;
          bottom:100px;
          z-index:30;
        }

        .ap-uploadFloatBtn{
          width:86px;
          min-height:86px;
          border:none;
          background:#ECEBECD4;
          border-radius:20px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:8px;
          box-shadow:0 8px 20px rgba(0,0,0,0.12);
          cursor:pointer;
          transition:transform 120ms ease;
        }
        .ap-uploadFloatBtn:active{
          transform:scale(0.93);
        }

        .ap-uploadFloatIcon{
          width:22px;
          height:22px;
          object-fit:contain;
          display:block;
        }

        .ap-uploadFloatText{
          font-size:11px;
          line-height:1.12;
          color:#6A6266;
          font-weight:500;
          text-align:center;
          white-space:pre-line;
        }

        .ap-lightbox{
  position:fixed;
  inset:0;
  background:#000;
  z-index:5100;
  overflow:hidden;
}

       .ap-lightboxInner{
  position:relative;
  width:100%;
  height:100%;
  overflow:hidden;
}

   .ap-lightboxImage{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:contain;
  background:#000;
  user-select:none;
  transition:transform 220ms ease, opacity 220ms ease;
  
}

        .ap-lightboxImage--active{
          transform:scale(1.002);
        }
.ap-lightboxTopFixed{
  position:absolute;
  top:24px;
  left:40px;
  right:40px;
  z-index:6;
  display:flex;
  align-items:center;
  justify-content:space-between;
}
        .ap-lightboxBack{
  width:50px;
  height:50px;
  border:none;
  background:#FFFFFF;
  border-radius:999px;
  margin-left:40px;
  padding:0;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 4px 14px rgba(0,0,0,0.15);
}

.ap-lightboxBack img{
  width:30px;
  height:30px;
  object-fit:contain;
}

.ap-lightboxSelectBtn{
  width:51px;
  height:51px;
  border:none;
  background:#FFFFFF;
  border-radius:999px;
  margin-right:40px;
  padding:13px;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 4px 14px rgba(0,0,0,0.15);
  transition:transform 120ms ease, box-shadow 120ms ease;
  box-sizing:border-box;
  gap:13px;
}

.ap-lightboxSelectBtn:active{
  transform:scale(0.92);
  box-shadow:0 2px 8px rgba(0,0,0,0.12);
}

.ap-lightboxSelectIcon{
  width:24px;
  height:24px;
  object-fit:contain;
  display:block;
}

    .ap-lightboxAlbumTag{
    min-width:100px;
  min-height:50px;
  padding:0 16px;
  border-radius:999px;
  background:#FBE8EC;
  color:#EF6A8A;
  font-size:18px;
  font-weight:500;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-right:70px;
  white-space:nowrap;
  box-shadow:0 8px 24px rgba(0,0,0,0.14);
}
  
        .ap-nav{
          position:absolute;
          top:50%;
          transform:translateY(-50%) scale(0.94);
          border:none;
          background:transparent;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:4;
          opacity:0;
          pointer-events:none;
          transition:opacity 220ms ease, transform 220ms ease;
          padding:0;
          margin:0;
        }

        .ap-nav--show{
          opacity:1;
          pointer-events:auto;
          transform:translateY(-50%) scale(1);
        }

        .ap-nav img{
          width:60px;
          height:60px;
          object-fit:contain;
          display:block;
        }

        .ap-nav--left{
          left:60px;
          transform:rotate(180deg);
        }

        .ap-nav--right{
          right:60px;
        }

    .ap-lightboxDots{
  position:absolute;
  left:50%;
  bottom:34px;
  transform:translateX(-50%);
  display:flex;
  align-items:center;
  gap:10px;
  z-index:20;

  background:#19191994;
  padding:8px 14px;
  border-radius:999px;
}

.ap-lightboxDot{
  width:10px;
  height:10px;
  border:none;
  border-radius:999px;
  background:#ffffff;
  cursor:pointer;
  opacity:0.9;
  transition:all 180ms ease;
}

.ap-lightboxDot--active{
  width:32px;
  height:10px;
  background:#EF6A8A;
}
        @keyframes apDotsFadeUp{
          from{
            opacity:0;
            transform:translateX(-50%) translateY(6px);
          }
          to{
            opacity:1;
            transform:translateX(-50%) translateY(0);
          }
        }

        @keyframes ap-deleteOverlayIn{
          from{opacity:0;}
          to{opacity:1;}
        }
        @keyframes ap-deleteOverlayOut{
          from{opacity:1;}
          to{opacity:0;}
        }
        @keyframes ap-deleteModalIn{
          from{opacity:0;transform:scale(0.88) translateY(12px);}
          to{opacity:1;transform:scale(1) translateY(0);}
        }
        @keyframes ap-deleteModalOut{
          from{opacity:1;transform:scale(1) translateY(0);}
          to{opacity:0;transform:scale(0.88) translateY(12px);}
        }

        .ap-deleteOverlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.28);
          z-index:5200;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          animation:ap-deleteOverlayIn 200ms ease both;
        }
        .ap-deleteOverlay--out{
          animation:ap-deleteOverlayOut 300ms cubic-bezier(0,0,0.2,1) both;
        }

        .ap-deleteModal{
          width:min(500px, 92vw);
          background:#FFFFFFD9;
          min-height:300px;
          border-radius:18px;
          padding:18px 16px 14px;
          position:relative;
          box-shadow:0 24px 60px rgba(0,0,0,0.18);
          text-align:center;
          animation:ap-deleteModalIn 260ms cubic-bezier(0.34,1.2,0.64,1) both;
        }
        .ap-deleteModal--out{
          animation:ap-deleteModalOut 300ms cubic-bezier(0,0,0.2,1) both;
          pointer-events:none;
        }

        .ap-deleteClose{
          position:absolute;
          top:14px;
          right:14px;
          width:30px;
          height:30px;
          border:none;
          background:rgba(0,0,0,0.06);
          border-radius:999px;
          color:#8a8a8a;
          font-size:18px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          transition:transform 120ms ease, background 120ms ease;
        }
        .ap-deleteClose:active{
          transform:scale(0.88);
          background:rgba(0,0,0,0.12);
        }

        .ap-deleteTitle{
          margin-top:40px;
          font-size:30px;
          font-weight:700;
          color:#555;
        }

        .ap-deletePrimary{
          margin-top:30px;
          width:80%;
          height:50px;
          border:none;
          border-radius:21px;
          background:#F96A86;
          color:#fff;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
        }

        .ap-deleteGhost{
          margin-top:20px;
          width:80%;
          height:50px;
          border:none;
          border-radius:21px;
          background:#C4C2C3;
          color:#fff;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
        }

        .ap-deletePrimary:disabled,
        .ap-deleteGhost:disabled{
          opacity:0.6;
          cursor:not-allowed;
        }

        @keyframes ap-overlayFadeIn{
          from{opacity:0;}
          to{opacity:1;}
        }
        @keyframes ap-overlayFadeOut{
          from{opacity:1;}
          to{opacity:0;}
        }
        @keyframes ap-sheetSlideUp{
          from{transform:translateY(100%);}
          to{transform:translateY(0);}
        }
        @keyframes ap-sheetSlideDown{
          from{transform:translateY(0);}
          to{transform:translateY(100%);}
        }

        .ap-uploadModalOverlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.42);
          z-index:5300;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          animation:ap-overlayFadeIn 220ms ease both;
        }
        .ap-uploadModalOverlay--out{
          animation:ap-overlayFadeOut 280ms ease both;
        }

        .ap-uploadModalSheet{
          width:100%;
          max-width:none;
          min-height:320px;
          background:#fff;
          border-radius:28px 28px 0 0;
          padding:50px 82px 34px;
          position:relative;
          box-sizing:border-box;
          animation:ap-sheetSlideUp 300ms cubic-bezier(0,0,0.2,1) both;
        }
        .ap-uploadModalSheet--out{
          animation:ap-sheetSlideDown 280ms cubic-bezier(0.4,0,1,1) both;
          pointer-events:none;
        }

        .ap-uploadModalClose{
          position:absolute;
          right:28px;
          top:18px;
          width:24px;
          height:24px;
          border:none;
          background:transparent;
          cursor:pointer;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .ap-uploadModalClose img{
          width:14px;
          height:14px;
          object-fit:contain;
          opacity:0.7;
        }

        .ap-uploadModalGrid{
          display:grid;
          grid-template-columns:minmax(360px, 1fr) minmax(360px, 1fr);
          gap:14px;
          align-items:stretch;
        }

        .ap-dropCard,
        .ap-queue{
          position:relative;
          border-radius:20px;
          border:1px solid rgba(0,0,0,0.08);
          background:#fff;
          padding:18px;
          min-height:320px;
        }

        .ap-drop{
          border-radius:18px;
          border:1px solid rgba(0,0,0,0.08);
          background:#fff;
          min-height:282px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          transition:transform 140ms ease, box-shadow 140ms ease;
          padding:24px 20px;
          width:100%;
          margin:0 auto;
        }

        .ap-drop--active{
          box-shadow:0 16px 40px rgba(232,98,140,0.14);
          transform:translateY(-2px);
        }

        .ap-dropIcon{
          display:flex;
          align-items:center;
          justify-content:center;
          margin-bottom:18px;
          pointer-events:none;
        }

        .ap-dropIcon img{
          width:30px;
          height:30px;
          object-fit:contain;
        }

        .ap-dropTitle{
          font-weight:800;
          font-size:15px;
          color:#2b2b2b;
          line-height:1.2;
        }

        .ap-dropSub{
          margin-top:8px;
          color:#858585;
          font-size:15px;
          line-height:1.4;
        }

        .ap-uploadBtnModal{
          margin-top:12px;
          width:300px;
          height:44px;
          border-radius:20px !important;
          font-size:14px;
          letter-spacing:0.02em;
          opacity:1 !important;
          cursor:pointer !important;
          background:#EF6A8A;
          color:#fff;
          border:none;
          font-weight:800;
        }

        .ap-dropNote{
          margin-top:14px;
          color:#9a9a9a;
          font-size:12px;
          line-height:1.4;
          text-align:center;
          max-width:320px;
        }

        .ap-queueTop{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
          margin-bottom:12px;
        }

        .ap-queueTitle{
          font-weight:800;
          font-size:24px;
          color:#2b2b2b;
          text-align:center;
          width:100%;
        }

        .ap-overall{
          border:1px solid rgba(0,0,0,0.06);
          background:#fcfcfc;
          border-radius:14px;
          padding:14px 14px 12px;
        }

        .ap-overallTopLine{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
          margin-bottom:8px;
        }

        .ap-overallMeta{
          display:flex;
          flex-direction:column;
          gap:2px;
          margin-bottom:0;
        }

        .ap-overallTitle{
          font-size:13px;
          font-weight:800;
          color:#1f1f1f;
        }

        .ap-overallSub{
          font-size:11px;
          color:#8a8a8a;
        }

        .ap-overallActions{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .ap-iconMini{
          height:28px;
          padding:0 10px;
          border-radius:6px;
          border:1px solid rgba(0,0,0,0.08);
          background:#fff;
          display:flex;
          align-items:center;
          gap:6px;
          cursor:pointer;
          font-size:10px;
          color:#6f6f6f;
        }

        .ap-iconMini img{
          width:10px;
          height:10px;
          object-fit:contain;
        }

        .ap-iconMini--ghost{
          background:#fafafa;
        }

        .ap-iconMini:disabled{
          opacity:0.45;
          cursor:not-allowed;
        }

        .ap-overallBar{
          height:6px;
          border-radius:999px;
          background:#e8e8e8;
          overflow:hidden;
        }

        .ap-overallBarFill{
          height:100%;
          border-radius:999px;
          background:linear-gradient(90deg, #FF7B98 0%, #F04C8C 55%, #D91CFF 100%);
          transition:width 180ms ease;
        }

        .ap-overallFoot{
          margin-top:8px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          font-size:11px;
          color:#7f7f7f;
        }

        .ap-uploadingFilesTitle{
          margin-top:14px;
          margin-bottom:10px;
          font-size:14px;
          font-weight:800;
          color:#2b2b2b;
        }

        .ap-emptyWrap2{
          min-height:240px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
        }

        .ap-emptyTitle2{
          font-size:20px;
          color:#666;
          font-weight:500;
        }

        .ap-emptySub2{
          margin-top:6px;
          color:#9a9a9a;
          font-size:13px;
        }

        .ap-list{
          margin-top:12px;
          display:flex;
          flex-direction:column;
          gap:10px;
          max-height:420px;
          overflow:auto;
          padding-right:2px;
        }

        .ap-dupBanner{
          width:100%;
          margin-top:14px;
          min-height:46px;
          border:none;
          border-radius:16px;
          background:#ECEAEA;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          cursor:pointer;
          color:#FF2A2A;
          font-size:22px;
          font-weight:700;
          padding:10px 14px;
        }

        .ap-dupBannerIcon{
          width:18px;
          height:18px;
          border-radius:999px;
          border:2px solid #FF2A2A;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:13px;
          font-weight:900;
          line-height:1;
          flex:0 0 auto;
        }

        .ap-dupBannerText{
          font-size:14px;
          font-weight:500;
          color:#FF2A2A;
        }

        @keyframes ap-viewBtnIn{
          from{opacity:0;transform:translateY(8px);}
          to{opacity:1;transform:translateY(0);}
        }

        .ap-viewAlbumBtn{
          display:block;
          width:100%;
          margin-top:14px;
          padding:12px 0;
          border:none;
          border-radius:14px;
          background:#EF6A8A;
          color:#fff;
          font-size:14px;
          font-weight:800;
          letter-spacing:0.3px;
          cursor:pointer;
          animation:ap-viewBtnIn 300ms cubic-bezier(0,0,0.2,1) both;
          transition:transform 120ms ease, opacity 120ms ease;
        }
        .ap-viewAlbumBtn:active{
          transform:scale(0.97);
        }

        @media (max-width: 1200px){
          .ap-grid{
            grid-template-columns:repeat(5, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px){
          .ap-grid{
            grid-template-columns:repeat(4, minmax(0, 1fr));
          }

          .ap-topRow{
            grid-template-columns:1fr;
            gap:12px;
          }

          .ap-titleBlock{
            order:1;
          }

          .ap-topRightStack{
            order:2;
            align-items:center;
          }

          .ap-uploadModalSheet{
            padding:46px 20px 24px;
          }

          .ap-uploadModalGrid{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 700px){
          .ap-fixedNav{
            padding:12px 16px 8px;
          }

          .ap-gridWrap{
            padding:16px 16px 24px;
          }

          .ap-grid{
            grid-template-columns:repeat(2, minmax(0, 1fr));
            gap:10px;
          }

        .ap-lightboxTopFixed{
  top:14px;
  left:14px;
  right:14px;
}

          .ap-lightboxBack img{
            width:16px;
            height:16px;
          }

          .ap-lightboxAlbumTag{
            min-height:28px;
            padding:0 12px;
            font-size:13px;
          }

          .ap-nav img{
            width:20px;
            height:20px;
          }

          .ap-nav--left{
            left:12px;
          }

          .ap-nav--right{
            right:12px;
          }

          .ap-lightboxDots{
            bottom:16px;
            gap:7px;
          }

          .ap-lightboxDot{
            width:7px;
            height:7px;
          }

          .ap-lightboxDot--active{
            width:22px;
          }

          .ap-bottomDeleteWrap,
          .ap-uploadFloatWrap{
            right:14px;
            bottom:14px;
          }

          .ap-uploadBtnModal{
            width:100%;
          }

          .ap-overallFoot{
            flex-direction:column;
            align-items:flex-start;
          }

          .ap-overallTopLine{
            flex-direction:column;
          }
        }
        .ap-lightbox{
  position:fixed;
  inset:0;
  background:#000;
  z-index:5100;
  overflow:hidden;
}

.ap-lightbox--entering{
  animation:apLightboxFadeIn 240ms ease forwards;
}

.ap-lightbox--exiting{
  animation:apLightboxFadeOut 300ms cubic-bezier(0,0,0.2,1) forwards;
  pointer-events:none;
}

.ap-lightbox--entered{
  background:#000;
}

.ap-lightboxInner{
  position:relative;
  width:100%;
  height:100%;
  overflow:hidden;
}

.ap-lightboxImage{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:contain;
  background:#000;
  user-select:none;
  z-index:1;
  will-change:transform, opacity;
}

.ap-lightboxImage--active{
  transform:scale(1.002);
}

.ap-lightboxImage--entering{
  animation:apImageZoomIn 300ms cubic-bezier(0,0,0.2,1) forwards;
}

.ap-lightboxImage--exiting{
  animation:apImageZoomOut 300ms cubic-bezier(0,0,0.2,1) forwards;
}

.ap-lightboxImage--entered{
  opacity:1;
  transform:scale(1);
}

.ap-lightboxTopFixed,
.ap-lightboxDots{
  transition:opacity 220ms ease, transform 220ms ease;
}

.ap-lightbox--entering .ap-lightboxTopFixed{
  opacity:0;
  transform:translateY(-8px);
}

.ap-lightbox--entering .ap-lightboxDots{
  opacity:0;
  transform:translateX(-50%) translateY(8px);
}

.ap-lightbox--entered .ap-lightboxTopFixed{
  opacity:1;
  transform:translateY(0);
}

.ap-lightbox--entered .ap-lightboxDots{
  opacity:1;
  transform:translateX(-50%) translateY(0);
}

@keyframes apLightboxFadeIn{
  from{background:rgba(0,0,0,0);}
  to{background:rgba(0,0,0,1);}
}

@keyframes apLightboxFadeOut{
  from{background:rgba(0,0,0,1);}
  to{background:rgba(0,0,0,0);}
}

@keyframes apImageZoomIn{
  from{opacity:0;transform:scale(0.12);}
  to{opacity:1;transform:scale(1);}
}

@keyframes apImageZoomOut{
  from{opacity:1;transform:scale(1);}
  to{opacity:0;transform:scale(0.12);}
}

.ap-lightbox--exiting .ap-lightboxTopFixed{
  opacity:0;
  transform:translateY(-8px);
  transition:opacity 220ms ease, transform 220ms ease;
}

.ap-lightbox--exiting .ap-lightboxDots{
  opacity:0;
  transform:translateX(-50%) translateY(8px);
  transition:opacity 220ms ease, transform 220ms ease;
}
      `}</style>
    </>
  );
}

function DuplicateDetectionModal({
  duplicateCase,
  onClose,
  onSkipThis,
  onReplaceThis,
  onSkipAll,
  onReplaceAll,
  isBusy,
  closeIcon,
  warningIcon,
}) {
  const existingPhoto = duplicateCase?.duplicateData?.existingPhoto || {};
  const incomingPhoto = duplicateCase?.duplicateData?.incomingPhoto || {};

  return (
    <div className="ap-dupModalOverlay" onClick={onClose}>
      <div className="ap-dupModal" onClick={(e) => e.stopPropagation()}>
        <button className="ap-dupClose" type="button" onClick={onClose} disabled={isBusy}>
          <img src={closeIcon} alt="Close" />
        </button>

        <div className="ap-dupHeader">
          <img src={warningIcon} alt="Warning" className="ap-dupAlertIcon" />
          <div className="ap-dupHeaderText">
            <div className="ap-dupTitle">Duplicate Photo Detected</div>
            <div className="ap-dupSub">Detailed breakdown of your upload storage</div>
          </div>
        </div>

        <div className="ap-dupFileLabel">File name:</div>
        <div className="ap-dupFileName">
          {duplicateCase?.fileName || incomingPhoto?.fileName || "—"}
        </div>

        <div className="ap-dupCompareGrid">
          <div className="ap-dupCard">
            <div className="ap-dupCardLabel">Previously Uploaded</div>
            <div className="ap-dupImageWrap">
              {existingPhoto?.previewUrl ? (
                <img
                  className="ap-dupImage"
                  src={existingPhoto.previewUrl}
                  alt="Previously uploaded"
                />
              ) : (
                <div className="ap-dupImageEmpty">No preview</div>
              )}
            </div>
            <div className="ap-dupMetaText">
              {existingPhoto?.uploadedLabel || "Previously uploaded"}
            </div>
          </div>

          <div className="ap-dupCard">
            <div className="ap-dupCardLabel ap-dupCardLabel--pink">New Upload</div>
            <div className="ap-dupImageWrap">
              {duplicateCase?.itemPreview ? (
                <img className="ap-dupImage" src={duplicateCase.itemPreview} alt="New upload" />
              ) : (
                <div className="ap-dupImageEmpty">No preview</div>
              )}
            </div>
            <div className="ap-dupMetaText">Uploading now</div>
          </div>
        </div>

        <div className="ap-dupTip">
          <span className="ap-dupTipStrong">Tip:</span>
          &nbsp;If you have multiple duplicates in this upload batch, you can apply your choice to
          all similar cases.
        </div>

        <div className="ap-dupBtnRow">
          <button
            type="button"
            className="ap-dupBtn ap-dupBtn--ghost"
            onClick={onSkipThis}
            disabled={isBusy}
          >
            {isBusy ? "Please wait..." : "Skip This Upload"}
          </button>
          <button
            type="button"
            className="ap-dupBtn ap-dupBtn--primary"
            onClick={onReplaceThis}
            disabled={isBusy}
          >
            {isBusy ? "Please wait..." : "Replace Old Photo"}
          </button>
        </div>

        <div className="ap-dupBtnRow">
          <button
            type="button"
            className="ap-dupBtn ap-dupBtn--ghost"
            onClick={onSkipAll}
            disabled={isBusy}
          >
            {isBusy ? "Please wait..." : "Skip All Duplicates"}
          </button>
          <button
            type="button"
            className="ap-dupBtn ap-dupBtn--ghost"
            onClick={onReplaceAll}
            disabled={isBusy}
          >
            {isBusy ? "Please wait..." : "Replace All Duplicates"}
          </button>
        </div>

        <style>{`
          .ap-dupModalOverlay{
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.42);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:5400;
            padding:20px;
          }

          .ap-dupModal{
            width:min(820px, 96vw);
            background:#FFFFFFD9;
            border-radius:26px;
            padding:48px 60px;
            position:relative;
            box-shadow:0 30px 80px rgba(0,0,0,0.18);
          }

          .ap-dupClose{
            position:absolute;
            right:22px;
            top:18px;
            width:24px;
            height:24px;
            border:none;
            background:transparent;
            cursor:pointer;
            padding:0;
            display:flex;
            align-items:center;
            justify-content:center;
          }

          .ap-dupClose img{
            width:14px;
            height:14px;
            object-fit:contain;
            opacity:0.7;
          }

          .ap-dupHeader{
            display:flex;
            align-items:center;
            justify-content:center;
            gap:10px;
            text-align:center;
          }

          .ap-dupAlertIcon{
            width:24px;
            height:24px;
            object-fit:contain;
            position:relative;
            top:-10px;
          }

          .ap-dupHeaderText{
            text-align:left;
          }

          .ap-dupTitle{
            font-size:18px;
            line-height:1.2;
            font-weight:900;
            color:#5a5a5a;
          }

          .ap-dupSub{
            margin-top:4px;
            color:#666263;
            font-size:12px;
            text-align:center;
            font-weight:300;
          }

          .ap-dupFileLabel{
            margin-top:18px;
            font-size:12px;
            color:#3e3e3e;
            font-weight:700;
          }

          .ap-dupFileName{
            margin-top:6px;
            min-height:38px;
            border-radius:10px;
            background:#ECEBEC;
            color:#777;
            font-size:12px;
            display:flex;
            align-items:center;
            padding:0 14px;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          }

          .ap-dupCompareGrid{
            margin-top:18px;
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:14px;
          }

          .ap-dupCardLabel{
            font-size:10px;
            color:#9a9a9a;
            margin-bottom:8px;
            background:#ECEBEC;
            border-radius:12px;
            max-width:320px;
            padding:6px 10px;
          }

          .ap-dupCardLabel--pink{
            color:#EF6A8A;
            background:#ECEBEC;
          }

          .ap-dupImageWrap{
            width:100%;
            aspect-ratio:1.55;
            border-radius:12px;
            overflow:hidden;
            background:#f2f2f2;
            border:1px solid rgba(0,0,0,0.06);
            box-shadow:0 8px 18px rgba(0,0,0,0.08);
          }

          .ap-dupImage{
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
          }

          .ap-dupImageEmpty{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#999;
            font-size:13px;
          }

          .ap-dupMetaText{
            margin-top:8px;
            font-size:10px;
            color:#8b8b8b;
          }

          .ap-dupTip{
            margin-top:14px;
            min-height:40px;
            border-radius:10px;
            border:1px solid rgba(239,106,138,0.18);
            background:#ECEBEC;
            color:#ff4c4c;
            font-size:11px;
            font-weight:500;
            display:flex;
            align-items:center;
            padding:0 12px;
          }

          .ap-dupTipStrong{
            font-weight:900;
          }

          .ap-dupBtnRow{
            margin-top:10px;
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
          }

          .ap-dupBtn{
            height:34px;
            border-radius:10px;
            font-size:14px;
            cursor:pointer;
          }

          .ap-dupBtn--ghost{
            border:1px solid #2D2A2B;
            background:#fff;
            color:#2D2A2B;
          }

          .ap-dupBtn--primary{
            border:1px solid #EF6A8A;
            background:#EF6A8A;
            color:#fff;
          }

          .ap-dupBtn:disabled,
          .ap-dupClose:disabled{
            opacity:0.65;
            cursor:not-allowed;
          }

          @media (max-width: 760px){
            .ap-dupModal{
              padding:22px 16px 18px;
            }

            .ap-dupCompareGrid,
            .ap-dupBtnRow{
              grid-template-columns:1fr;
            }

            .ap-dupHeader{
              align-items:flex-start;
            }

            .ap-dupHeaderText{
              text-align:left;
            }
          }
            
        `}</style>
      </div>
    </div>
  );
}

function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;

  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }

  if (i >= 3) {
    return `${Math.round(v)} ${units[i]}`;
  }

  return `${v.toFixed(1)} ${units[i]}`;
}

function getStatusText(status, progress) {
  if (status === "done") return "Upload complete";
  if (status === "saving") return "Saving to album...";
  if (status === "checking") return "Checking duplicate...";
  if (status === "duplicate") return "Duplicate detected";
  if (status === "resolving-duplicate") return "Replacing old duplicate...";
  if (status === "skipped") return "Duplicate skipped";
  if (status === "uploading") return `${Math.max(1, Math.round(progress || 0))}% uploaded`;
  if (status === "error") return "Upload failed";
  return "Waiting to upload";
}

function QueueRow({ item, onRemove, onRetry, disabled, closeIcon, pauseIcon }) {
  const { file, status, progress, error, preview, sizeBytes } = item;
  const isImage = String(file?.type || "").startsWith("image/");

  const showBar =
    status === "uploading" ||
    status === "saving" ||
    status === "done" ||
    status === "checking" ||
    status === "resolving-duplicate";

  return (
    <div className="ap-rowItem">
      <div className="ap-thumbWrap">
        {isImage && preview ? (
          <img className="ap-thumb" src={preview} alt={file?.name || "upload"} />
        ) : (
          <div className="ap-thumbFallback">VID</div>
        )}
      </div>

      <div className="ap-left">
        <div className="ap-name" title={file?.name}>
          {file?.name}
        </div>

        <div
          className={`ap-meta ${
            status === "done"
              ? "ap-meta--done"
              : status === "duplicate"
              ? "ap-meta--dup"
              : status === "skipped"
              ? "ap-meta--skip"
              : ""
          }`}
        >
          <span>{getStatusText(status, progress)}</span>
        </div>

        {showBar ? (
          <div className="ap-bar">
            <div className="ap-barFill" style={{ width: `${Math.max(2, progress)}%` }} />
          </div>
        ) : null}

        {status === "error" ? <div className="ap-err2">{error}</div> : null}
      </div>

      <div className="ap-right">
        <div className="ap-fileSize">{fmtBytes(sizeBytes || file?.size || 0)}</div>

        {(status === "uploading" || status === "saving" || status === "resolving-duplicate") && (
          <span className="ap-rowPauseIcon" title="Uploading">
            <img src={pauseIcon} alt="Uploading" />
          </span>
        )}

        {status === "error" ? (
          <button className="ap-retry" onClick={onRetry} disabled={disabled}>
            Retry
          </button>
        ) : null}

        {status === "duplicate" ? (
          <button className="ap-retry ap-retry--dup" onClick={onRetry} disabled={disabled}>
            View
          </button>
        ) : null}

        <button
          className="ap-x"
          onClick={onRemove}
          disabled={
            disabled ||
            status === "uploading" ||
            status === "saving" ||
            status === "resolving-duplicate"
          }
        >
          <img src={closeIcon} alt="Remove" />
        </button>
      </div>

      <style>{`
        .ap-rowItem{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          border:1px solid rgba(0,0,0,0.05);
          border-radius:10px;
          padding:10px 12px;
          background:#f8f8f8;
        }

        .ap-thumbWrap{
          width:38px;
          height:38px;
          border-radius:8px;
          overflow:hidden;
          background:#f4f4f4;
          border:1px solid rgba(0,0,0,0.05);
          flex:0 0 auto;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .ap-thumb{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }

        .ap-thumbFallback{
          font-size:10px;
          font-weight:800;
          color:#8f8f8f;
        }

        .ap-left{
          flex:1;
          min-width:0;
        }

        .ap-name{
          font-weight:700;
          font-size:12px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          color:#4a4a4a;
        }

        .ap-meta{
          margin-top:3px;
          font-size:10px;
          color:#b65068;
          display:flex;
          align-items:center;
          gap:6px;
          flex-wrap:wrap;
        }

        .ap-meta--done{
          color:#63b96b;
        }

        .ap-meta--dup{
          color:#ef6a8a;
        }

        .ap-meta--skip{
          color:#8a8a8a;
        }

        .ap-bar{
          margin-top:8px;
          height:3px;
          border-radius:999px;
          background:#edd7de;
          overflow:hidden;
        }

        .ap-barFill{
          height:100%;
          background:linear-gradient(90deg, #ff88a4 0%, #ef6a8a 55%, #cf4868 100%);
          border-radius:999px;
          transition:width 180ms ease;
        }

        .ap-err2{
          margin-top:8px;
          color:#b42318;
          font-size:11px;
        }

        .ap-right{
          display:flex;
          align-items:center;
          gap:8px;
          padding-left:6px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .ap-fileSize{
          font-size:10px;
          color:#8a8a8a;
          min-width:max-content;
        }

        .ap-rowPauseIcon{
          width:16px;
          height:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
        }

        .ap-rowPauseIcon img{
          width:10px;
          height:10px;
          object-fit:contain;
          opacity:0.75;
        }

        .ap-retry{
          height:28px;
          padding:0 10px;
          border-radius:999px;
          border:1px solid rgba(239,106,138,0.28);
          background:rgba(239,106,138,0.08);
          color:#EF6A8A;
          cursor:pointer;
          font-weight:800;
          font-size:11px;
        }

        .ap-retry--dup{
          background:#fff3f6;
          border-color:#ef6a8a;
        }

        .ap-x{
          width:18px;
          height:18px;
          border:none;
          background:transparent;
          cursor:pointer;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .ap-x img{
          width:10px;
          height:10px;
          object-fit:contain;
          opacity:0.7;
        }

        .ap-x:disabled,
        .ap-retry:disabled{
          opacity:0.5;
          cursor:not-allowed;
        }

        @media (max-width: 640px){
          .ap-rowItem{
            align-items:flex-start;
          }

          .ap-right{
            width:100%;
            justify-content:flex-start;
            padding-left:0;
            margin-top:8px;
          }
        }
      `}</style>
    </div>
  );
}