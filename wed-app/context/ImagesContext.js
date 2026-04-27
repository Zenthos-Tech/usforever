// context/ImagesContext.js
// Image cache + selection / favourites state, backed by wed-backend's
// Express + Mongoose API:
//
//   GET    /api/photos?albumId=…       — paginated album photo list
//   GET    /api/photos/:id             — single photo (not used here)
//   DELETE /api/photos/:id             — remove a photo
//   GET    /api/share/photos?…         — guest deep-link photo list
//   PUT    /api/tv/selections          — sync selectedFolder for the paired TV

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/api';
import { useWedding } from './WeddingContext';

const AUTH_TOKEN_KEY = 'USFOREVER_AUTH_TOKEN_V1';

const ImagesContext = createContext(undefined);

const safeLower = (v) => String(v || '').toLowerCase().trim();

const uniqById = (arr) => {
  const map = new Map();
  (arr || []).forEach((x) => {
    if (!x) return;
    let idRaw = x.id != null ? x.id : x._id != null ? x._id : x.uuid != null ? x.uuid : '';
    const id = String(idRaw || '').trim();
    if (!id) return;
    map.set(id, { ...x, id });
  });
  return Array.from(map.values());
};

const isTmpId = (id) => String(id || '').startsWith('tmp_');

const normalizeServerImages = (list) => {
  const arr = Array.isArray(list) ? list : [];

  return uniqById(
    arr
      .map((x) => {
        const row = x || {};
        const a = row;

        const id = String(row?._id || row?.id || row?.uuid || '').trim();

        // ✅ FIX: include image_url + common Strapi/raw fields even if not inside attributes
        const uri =
          a?.uri ||
          a?.url ||
          a?.image ||
          a?.image_url ||
          a?.imageUrl ||
          a?.imageURL ||
          a?.imageUrlKey ||
          a?.image_key ||
          a?.key ||
          a?.path ||
          row?.image_url ||
          row?.imageUrl ||
          row?.url ||
          '';

        const albumId =
          a?.albumId != null
            ? String(a.albumId).trim()
            : a?.album?.id != null
            ? String(a.album.id).trim()
            : a?.album?.data?.id != null
            ? String(a.album.data.id).trim()
            : null;

        return { ...row, ...a, id, uri: String(uri || '').trim(), albumId };
      })
      .filter((x) => x?.id && x?.uri)
  );
};

function getApiBase() {
  const base = String(API_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('Missing API_URL');
  if (base.endsWith('/api')) return base;
  return `${base}/api`;
}

async function apiFetch(path, options) {
  const baseApi = getApiBase();
  const p = String(path || '').startsWith('/') ? String(path) : `/${String(path)}`;
  const url = `${baseApi}${p}`;

  const res = await fetch(url, options);
  const raw = await res.text();

  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!res.ok) {
    return { ok: false, url, status: res.status, body: json ?? raw };
  }
  return { ok: true, url, status: res.status, json: json ?? raw };
}

async function rawFetchAbsolute(url, options) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!res.ok) return { ok: false, url, status: res.status, body: json ?? raw };
  return { ok: true, url, status: res.status, json: json ?? raw };
}

const PHOTOS_PAGE_SIZE = 60;

export const ImagesProvider = ({ children }) => {
  const { weddingData } = useWedding();
  const [imagesByAlbum, setImagesByAlbum] = useState({});
  const [activeAlbumId, setActiveAlbumId] = useState(null);

  // pagination state per album: { [albumId]: { cursor, hasMore, loading } }
  const [paginationByAlbum, setPaginationByAlbum] = useState({});

  console.log(paginationByAlbum,'PAGINATION');

  const images = useMemo(() => {
    const id = String(activeAlbumId || '');
    if (!id) return [];
    return imagesByAlbum?.[id] || [];
  }, [imagesByAlbum, activeAlbumId]);

  const [selectedImage, setSelectedImage] = useState(null);

  const [favorites, setFavorites] = useState({});
  const [previewFromFavorites, setPreviewFromFavorites] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState({});
  const [previewFromSelected, setPreviewFromSelected] = useState(false);

  // Push the current selected IDs to the backend. Single source of truth —
  // see the debounced effect below. The per-mutation handlers (`addToSelected`,
  // `removeFromSelected`, `clearSelected`) used to call this directly, which
  // caused 5–10 PUTs per multi-select burst.
  const pushSelectionsToBackend = async (folder) => {
    const weddingId = String(weddingData?.weddingId || '').trim();
    if (!weddingId) return;
    const photoIds = Object.values(folder || {}).flat().map((it) => String(it?.id || '')).filter(Boolean);
    const base = String(API_URL || '').replace(/\/+$/, '');
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;
      await fetch(`${base}/tv/selections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weddingId, photoIds }),
      });
    } catch (_) {}
  };

  // Debounced sync — coalesces a burst of selectedFolder mutations into one
  // PUT after the user stops swiping for 400 ms.
  const SYNC_DEBOUNCE_MS = 400;
  useEffect(() => {
    const timer = setTimeout(() => {
      pushSelectionsToBackend(selectedFolder);
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, weddingData?.weddingId]);

  const [readOnly, setReadOnly] = useState(false);
  const [role, setRole] = useState('guest');

  const [shareAccess, setShareAccess] = useState({ slug: '', token: '', role: 'guest', accessToken: '' });

  const syncingRef = useRef(false);

  const setAlbumScope = (albumId) => {
    const id = String(albumId || '').trim();
    setActiveAlbumId(id || null);
    setSelectedImage(null);
  };

  const getImagesByAlbum = (albumId) => {
    const id = String(albumId || '').trim();
    if (!id) return [];
    return imagesByAlbum?.[id] || [];
  };

  const addImages = (newImages) => {
    const id = String(activeAlbumId || '').trim();
    if (!id) return;

    setImagesByAlbum((prev) => {
      const cur = prev?.[id] || [];
      const next = uniqById([...cur, ...(newImages || [])]);
      return { ...(prev || {}), [id]: next };
    });
  };

  const upsertImages = (albumId, incoming) => {
    const id = String(albumId || '').trim();
    if (!id) return;

    setImagesByAlbum((prev) => {
      const cur = prev?.[id] || [];
      const next = uniqById([...(incoming || []), ...cur]);
      return { ...(prev || {}), [id]: next };
    });
  };

  const addOptimisticImage = ({ albumId, uri, tmpId }) => {
    const id = String(albumId || activeAlbumId || '').trim();
    if (!id || !uri) return;

    const optimisticRow = {
      id: String(tmpId || `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`),
      uri: String(uri),
      albumId: id,
      _optimistic: true,
    };

    setImagesByAlbum((prev) => {
      const cur = prev?.[id] || [];
      const next = uniqById([optimisticRow, ...cur]);
      return { ...(prev || {}), [id]: next };
    });

    return optimisticRow.id;
  };

  const pruneOptimistic = (albumId) => {
    const id = String(albumId || activeAlbumId || '').trim();
    if (!id) return;

    setImagesByAlbum((prev) => {
      const cur = prev?.[id] || [];
      const next = cur.filter((img) => !img?._optimistic && !isTmpId(img?.id));
      return { ...(prev || {}), [id]: next };
    });
  };

  const replaceAlbumImagesSafe = (albumId, incoming) => {
    const id = String(albumId || '').trim();
    if (!id) return;

    const next = uniqById(incoming || []);
    setImagesByAlbum((prev) => {
      const cur = prev?.[id] || [];
      const finalList = next.length === 0 && cur.length > 0 ? cur : next;
      return { ...(prev || {}), [id]: finalList };
    });
  };

  const clearImages = (albumId) => {
    const id = String(albumId || activeAlbumId || '').trim();

    if (!id) {
      setImagesByAlbum({});
      setFavorites({});
      setSelectedFolder({});
      setSelectedImage(null);
      setActiveAlbumId(null);
      setPreviewFromFavorites(false);
      setPreviewFromSelected(false);
      return;
    }

    setImagesByAlbum((prev) => {
      const next = { ...(prev || {}) };
      delete next[id];
      return next;
    });

    setFavorites({});
    setSelectedFolder({});
    setSelectedImage(null);
    setPreviewFromFavorites(false);
    setPreviewFromSelected(false);
  };

  const getImagesByEvent = (event) => images.filter((img) => img?.event === event);

  // =====================
  // ✅ Selected folder helpers
  // =====================
  const getSelectedByEvent = (event) => {
    const key = String(event || '').trim() || 'Selected';
    return selectedFolder?.[key] || [];
  };

  const isSelected = (imageId, event) => {
    const key = String(event || '').trim() || 'Selected';
    return (selectedFolder?.[key] || []).some((it) => String(it?.id) === String(imageId));
  };

  const addToSelected = (image, event) => {
    if (!image?.id || !image?.uri) return;
    const key = String(event || image?.event || 'Selected').trim() || 'Selected';
    const row = { ...image, event: key };

    setSelectedFolder((prev) => {
      const cur = prev?.[key] || [];
      const next = uniqById([row, ...cur]);
      return { ...(prev || {}), [key]: next };
    });
  };

  const moveToSelected = (imagesToMove, event) => {
    const key = String(event || 'Selected').trim() || 'Selected';
    const arr = Array.isArray(imagesToMove) ? imagesToMove : [];
    if (!arr.length) return;

    const normalized = arr
      .map((it) => (it ? { ...it, event: key } : null))
      .filter((it) => it?.id && it?.uri);

    if (!normalized.length) return;

    setSelectedFolder((prev) => {
      const cur = prev?.[key] || [];
      const next = uniqById([...normalized, ...cur]);
      return { ...(prev || {}), [key]: next };
    });
  };

  const removeFromSelected = (imageId, event) => {
    const key = String(event || '').trim() || 'Selected';
    const iid = String(imageId || '').trim();
    if (!iid) return;

    setSelectedFolder((prev) => {
      const cur = prev?.[key] || [];
      const next = cur.filter((it) => String(it?.id) !== iid);
      const out = { ...(prev || {}) };
      if (next.length) out[key] = next;
      else delete out[key];
      return out;
    });
  };

  const clearSelected = (event) => {
    const key = String(event || '').trim();
    if (!key) {
      setSelectedFolder({});
      return;
    }
    setSelectedFolder((prev) => {
      const out = { ...(prev || {}) };
      delete out[key];
      return out;
    });
  };

  // =====================
  // 🗑️ DELETE (matches: DELETE /photos/:id)
  // =====================
  const removeImage = async (imageId, albumId) => {
    const aid = String(albumId || activeAlbumId || '').trim();
    const iid = String(imageId || '').trim();
    if (!aid || !iid) return;

    // optimistic UI
    setImagesByAlbum((prev) => {
      const cur = prev?.[aid] || [];
      const nextArr = cur.filter((img) => String(img?.id) !== iid);
      return { ...(prev || {}), [aid]: nextArr };
    });

    setFavorites((prev) => {
      const updated = {};
      Object.keys(prev || {}).forEach((event) => {
        const filtered = (prev[event] || []).filter((img) => String(img?.id) !== iid);
        if (filtered.length > 0) updated[event] = filtered;
      });
      return updated;
    });

    setSelectedFolder((prev) => {
      const out = {};
      Object.keys(prev || {}).forEach((event) => {
        const filtered = (prev[event] || []).filter((img) => String(img?.id) !== iid);
        if (filtered.length > 0) out[event] = filtered;
      });
      return out;
    });

    setSelectedImage((prev) => (prev && String(prev.id) === iid ? null : prev));

    // backend delete
    try {
      const r = await apiFetch(`/photos/${encodeURIComponent(iid)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!r?.ok) console.log('DELETE FAIL', r);
    } catch (e) {
      console.log('removeImage error', e);
    }
  };

  // =====================
  // ⭐ Favorites
  // =====================
  // ✅ FIX: allow event override + fallback event detection
  const addToFavorites = (image, eventOverride) => {
    if (!image?.id) return;

    const eventKey =
      String(
        eventOverride ||
          image?.event ||
          image?.folderName ||
          image?.folder ||
          image?.albumName ||
          image?.category ||
          ''
      ).trim();

    if (!eventKey) return;

    const row = { ...image, event: eventKey };

    setFavorites((prev) => {
      const eventFavs = prev?.[eventKey] || [];
      if (eventFavs.some((item) => String(item.id) === String(row.id))) return prev;

      return { ...(prev || {}), [eventKey]: [...eventFavs, row] };
    });
  };

  const removeFromFavorites = (imageId, event) => {
    setFavorites((prev) => {
      const updated = (prev?.[event] || []).filter((i) => String(i.id) !== String(imageId));

      if (updated.length === 0) {
        const next = { ...(prev || {}) };
        delete next[event];
        return next;
      }
      return { ...(prev || {}), [event]: updated };
    });
  };

  const isFavorite = (imageId, event) => (favorites?.[event] || []).some((item) => String(item.id) === String(imageId));
  const getFavoritesByEvent = (event) => favorites?.[event] || [];
  const hasFavorites = (event) => (favorites?.[event]?.length || 0) > 0;

  // =====================
  // ✅ SHARE / DEEP LINK ACCESS
  // =====================
  const setAccessFromShare = ({ role: nextRole }) => {
    const r = safeLower(nextRole || 'guest');
    const safeRole = r === 'couple' || r === 'photographer' || r === 'guest' ? r : 'guest';
    setRole(safeRole);
    setReadOnly(safeRole === 'guest');
  };

  const setDeepLinkAccess = ({ slug, token, role: nextRole, accessToken }) => {
    const r = safeLower(nextRole || 'guest');
    const safeRole = r === 'couple' || r === 'photographer' || r === 'guest' ? r : 'guest';

    setShareAccess({
      slug: String(slug || '').trim(),
      token: String(token || '').trim(),
      role: safeRole,
      accessToken: String(accessToken || '').trim(),
    });

    setRole(safeRole);
    setReadOnly(safeRole === 'guest');
  };

  /**
   * ✅ If slug+token present => guest:
   *    GET /share/photos?slug=...&t=...
   * ✅ Else => album:
   *    GET /photos?albumId=...
   */
  const syncFromDeepLink = async ({ slug, token, albumId, accessToken: argAccessToken }) => {
    const a = String(albumId || activeAlbumId || '').trim();
    const s = String(slug || shareAccess.slug || '').trim();
    const t = String(token || shareAccess.token || '').trim();
    const jwt = String(argAccessToken || shareAccess.accessToken || '').trim();

    if (s || t) {
      setShareAccess((prev) => ({
        ...(prev || {}),
        slug: s || prev.slug,
        token: t || prev.token,
        accessToken: jwt || prev.accessToken || '',
      }));
    }

    if (syncingRef.current) return { ok: true, skipped: true };
    syncingRef.current = true;

    try {
      const hasDeep = !!s && !!t;

      let r = null;

      console.log('[syncFromDeepLink] jwt=', jwt ? '✓' : '✗', 'albumId=', a, 'slug=', s ? '✓' : '✗');
      if (jwt && a) {
        // Preferred: use Bearer JWT issued by /resolve — works for both guests
        // and photographers, no passcode re-check needed.
        const base = String(API_URL || '').replace(/\/+$/, '');
        if (!base) return { ok: false, reason: 'missing_api_url' };
        const url = `${base}/share/photos?albumId=${encodeURIComponent(a)}`;
        console.log('[syncFromDeepLink] JWT fetch:', url);
        r = await rawFetchAbsolute(url, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${jwt}` },
        });
        console.log('[syncFromDeepLink] JWT result:', r?.status, r?.ok);
      } else if (hasDeep) {
        // Fallback: slug+t path (only works for non-passcode-protected links)
        const base = String(API_URL || '').replace(/\/+$/, '');
        if (!base) return { ok: false, reason: 'missing_api_url' };

        const albumSuffix = a ? `&albumId=${encodeURIComponent(a)}` : '';
        const url1 = `${base}/share/photos?slug=${encodeURIComponent(s)}&t=${encodeURIComponent(t)}${albumSuffix}`;

        r = await rawFetchAbsolute(url1, { method: 'GET', headers: { Accept: 'application/json' } });
      } else {
        if (!a) return { ok: false, reason: 'missing_albumId' };
        // ✅ YOUR controller route:
        r = await apiFetch(`/photos?albumId=${encodeURIComponent(a)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      }

      if (!r?.ok) {
        console.log('PHOTOS FETCH FAIL', r);
        return { ok: false, status: r?.status };
      }

      const json = r?.json;

      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.images)
        ? json.images
        : Array.isArray(json)
        ? json
        : [];

      const normalized = normalizeServerImages(list);
      const rawCount = Array.isArray(list) ? list.length : 0;

      const resolvedAlbumId = String(json?.meta?.albumId || '').trim();
      const targetAlbumId = String(resolvedAlbumId || a || '').trim();

      if (targetAlbumId) setActiveAlbumId(targetAlbumId);

      if (targetAlbumId) {
        setImagesByAlbum((prev) => {
          const cur = prev?.[targetAlbumId] || [];

          const serverUris = new Set(normalized.map((x) => String(x?.uri || '').trim()).filter(Boolean));
          const optimistic = cur.filter((x) => x?._optimistic || isTmpId(x?.id));
          const keepOptimistic = optimistic.filter((o) => !serverUris.has(String(o?.uri || '').trim()));

          if (rawCount === 0 && normalized.length === 0 && cur.length > 0) return prev;

          const merged = uniqById([...normalized, ...keepOptimistic]);
          return { ...(prev || {}), [targetAlbumId]: merged };
        });
      }

      return { ok: true, count: normalized.length, albumId: targetAlbumId };
    } catch (e) {
      console.log('syncFromDeepLink error', e);
      return { ok: false, error: String(e?.message || e) };
    } finally {
      syncingRef.current = false;
    }
  };

  const refreshActiveAlbum = async () => {
    const a = String(activeAlbumId || '').trim();
    if (!a) return { ok: false, reason: 'no_active_album' };
    return syncFromDeepLink({ albumId: a });
  };

  const fetchPhotosPage = async ({ albumId, cursor, limit, reset } = {}) => {
    const a = String(albumId || activeAlbumId || '').trim();
    if (!a) return { ok: false, reason: 'missing_albumId' };

    const pageSize = limit || PHOTOS_PAGE_SIZE;
    const pag = paginationByAlbum?.[a];

    if (!reset) {
      // prevent duplicate fetches
      if (pag?.loading) return { ok: true, skipped: true };

      // if we already fetched and there's no more, skip
      if (pag && !pag.hasMore) return { ok: true, done: true };
    }

    // use provided cursor, or stored cursor for this album (reset starts fresh)
    const c = reset ? '' : (cursor ?? (pag?.cursor || ''));

    // on reset, clear existing images for this album (keep optimistic)
    if (reset) {
      setImagesByAlbum((prev) => {
        const cur = prev?.[a] || [];
        const optimistic = cur.filter((x) => x?._optimistic || isTmpId(x?.id));
        return { ...(prev || {}), [a]: optimistic };
      });
    }

    setPaginationByAlbum((prev) => ({
      ...prev,
      [a]: { ...(prev?.[a] || {}), loading: true },
    }));

    try {
      let url = `/photos?albumId=${encodeURIComponent(a)}&limit=${pageSize}`;
      if (c) url += `&cursor=${encodeURIComponent(c)}`;

      const r = await apiFetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!r?.ok) {
        setPaginationByAlbum((prev) => ({
          ...prev,
          [a]: { ...(prev?.[a] || {}), loading: false },
        }));
        return { ok: false, status: r?.status };
      }

      const json = r?.json;
      const list = Array.isArray(json?.data) ? json.data : [];
      const normalized = normalizeServerImages(list);
      const nextCursor = json?.meta?.nextCursor || null;
      const hasMore = json?.meta?.hasMore ?? false;
      const totalCount = json?.meta?.totalCount ?? null;

      if (a) setActiveAlbumId(a);

      setImagesByAlbum((prev) => {
        const cur = prev?.[a] || [];
        const merged = uniqById([...cur, ...normalized]);
        return { ...(prev || {}), [a]: merged };
      });

      setPaginationByAlbum((prev) => ({
        ...prev,
        [a]: { cursor: nextCursor, hasMore, loading: false, totalCount: totalCount ?? prev?.[a]?.totalCount ?? null },
      }));

      return { ok: true, count: normalized.length, hasMore, nextCursor, albumId: a };
    } catch (e) {
      setPaginationByAlbum((prev) => ({
        ...prev,
        [a]: { ...(prev?.[a] || {}), loading: false },
      }));
      return { ok: false, error: String(e?.message || e) };
    }
  };

  const loadMorePhotos = async (albumId) => {
    const a = String(albumId || activeAlbumId || '').trim();
    if (!a) return;
    const pag = paginationByAlbum?.[a];
    if (!pag?.hasMore || pag?.loading) return;
    return fetchPhotosPage({ albumId: a, cursor: pag.cursor });
  };

  const getPhotoPagination = (albumId) => {
    const a = String(albumId || activeAlbumId || '').trim();
    return paginationByAlbum?.[a] || { cursor: null, hasMore: true, loading: false };
  };

  const value = useMemo(
    () => ({
      imagesByAlbum,
      activeAlbumId,
      setAlbumScope,
      getImagesByAlbum,

      images,
      addImages,
      upsertImages,
      replaceAlbumImagesSafe,
      clearImages,
      getImagesByEvent,
      removeImage,

      addOptimisticImage,
      pruneOptimistic,

      selectedImage,
      setSelectedImage,

      favorites,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      getFavoritesByEvent,
      hasFavorites,

      previewFromFavorites,
      setPreviewFromFavorites,

      selectedFolder,
      getSelectedByEvent,
      addToSelected,
      moveToSelected,
      removeFromSelected,
      clearSelected,
      isSelected,
      previewFromSelected,
      setPreviewFromSelected,

      readOnly,
      setReadOnly,

      role,
      setRole,

      shareAccess,
      setAccessFromShare,
      setDeepLinkAccess,
      syncFromDeepLink,
      refreshActiveAlbum,

      fetchPhotosPage,
      loadMorePhotos,
      getPhotoPagination,
      paginationByAlbum,
    }),
    [
      imagesByAlbum,
      activeAlbumId,
      images,
      selectedImage,
      favorites,
      previewFromFavorites,
      selectedFolder,
      previewFromSelected,
      readOnly,
      role,
      shareAccess,
      paginationByAlbum,
    ]
  );

  return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
};

export const useImages = () => {
  const context = useContext(ImagesContext);
  if (!context) throw new Error('useImages must be used inside ImagesProvider');
  return context;
};