// context/WeddingContext.js
// ✅ Persists locally (AsyncStorage) exactly like before
// ✅ Backend sync helpers (pull/push) you can call from screens
// ✅ NEW: Stores default albums in weddingData.albums
// ✅ NEW: Helper getDefaultAlbumId(kind) + applyOtpVerifyPayload(payload)
// ✅ NEW (EDIT PROFILE): Stores profilePhotoUri (export.png picker) + available everywhere
// ✅ NEW: Stores hasCompletedWeddingSetup so existing users can skip setup

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../utils/api';
import { getAuthToken, clearAuthToken } from '../utils/authToken';

const WeddingContext = createContext(undefined);

const STORAGE_KEY = 'USFOREVER_WEDDING_CTX_V1';

// Single source of truth for the backend base URL — `utils/api.ts` already
// resolves the env var. API_URL ends with `/api`, so strip it before tacking
// on these absolute `/api/...` endpoints.
const API_BASE = String(API_URL || '').replace(/\/+$/, '').replace(/\/api$/, '');

const ENDPOINTS = {
  getWedding: '/api/weddings/context',
  patchWedding: '/api/weddings/context',
};

const isNumericId = (v) => {
  const s = String(v || '').trim();
  return s.length > 0 && s !== 'undefined' && s !== 'null';
};

const initialWeddingData = {
  brideName: '',
  groomName: '',
  weddingDate: '',
  weddingId: '',
  phone: '',

  // ✅ NEW
  hasCompletedWeddingSetup: false,

  // ✅ NEW: profile photo uri for Edit Profile (visible everywhere)
  profilePhotoUri: '',

  // ✅ NEW: default albums stored here
  // shape:
  // albums: {
  //   wedding: { albumId: "123" },
  //   engagement: { albumId: "456" }
  // }
  albums: {
    wedding: { albumId: '' },
    engagement: { albumId: '' },
  },
};

const normalizeName = (v) =>
  String(v || '')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (obj) => {
  const o = { ...(obj || {}) };

  if ('weddingId' in o) o.weddingId = o.weddingId ? String(o.weddingId).trim() : '';
  if ('phone' in o) o.phone = o.phone ? String(o.phone).trim() : '';

  if ('brideName' in o) o.brideName = normalizeName(o.brideName);
  if ('groomName' in o) o.groomName = normalizeName(o.groomName);

  if ('weddingDate' in o) o.weddingDate = String(o.weddingDate || '').trim();

  // ✅ NEW: normalize completed setup flag
  if ('hasCompletedWeddingSetup' in o) {
    o.hasCompletedWeddingSetup = !!o.hasCompletedWeddingSetup;
  } else {
    o.hasCompletedWeddingSetup = false;
  }

  // ✅ NEW: normalize profile photo uri
  if ('profilePhotoUri' in o) {
    o.profilePhotoUri = o.profilePhotoUri ? String(o.profilePhotoUri).trim() : '';
  } else {
    o.profilePhotoUri = o.profilePhotoUri ?? '';
  }

  // ✅ NEW: normalize albums
  if ('albums' in o) {
    const a = o.albums || {};
    const w = a?.wedding?.albumId != null ? String(a.wedding.albumId).trim() : '';
    const e = a?.engagement?.albumId != null ? String(a.engagement.albumId).trim() : '';
    o.albums = {
      wedding: { albumId: isNumericId(w) ? w : '' },
      engagement: { albumId: isNumericId(e) ? e : '' },
    };
  } else {
    const prev = initialWeddingData.albums;
    o.albums = o.albums || prev;
  }

  return o;
};

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const WeddingProvider = ({ children }) => {
  const [weddingData, setWeddingDataState] = useState(initialWeddingData);
  const [hydrated, setHydrated] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const inFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;

        if (raw) {
          const parsed = JSON.parse(raw);
          setWeddingDataState((prev) => normalize({ ...prev, ...parsed }));
        }
      } catch {
      } finally {
        if (alive) setHydrated(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(weddingData)).catch(() => {});
  }, [hydrated, weddingData]);

  const setWeddingData = (updater) => {
    setWeddingDataState((prev) => {
      const nextPartial = typeof updater === 'function' ? updater(prev) : updater;
      return normalize({ ...prev, ...(nextPartial || {}) });
    });
  };

  const resetWedding = async () => {
    setWeddingDataState(initialWeddingData);

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    await clearAuthToken();
  };

  const setPhone = (phone) => setWeddingData({ phone });
  const setWeddingId = (weddingId) => setWeddingData({ weddingId });
  const setBrideName = (brideName) => setWeddingData({ brideName });
  const setGroomName = (groomName) => setWeddingData({ groomName });
  const setWeddingDate = (weddingDate) => setWeddingData({ weddingDate });
  const setWeddingSlug = (weddingSlug) => setWeddingData({ weddingSlug });

  // ✅ NEW
  const setHasCompletedWeddingSetup = (hasCompletedWeddingSetup) =>
    setWeddingData({ hasCompletedWeddingSetup: !!hasCompletedWeddingSetup });

  // ✅ NEW: set profile photo uri (used by EditProfileModal)
  const setProfilePhotoUri = (profilePhotoUri) => setWeddingData({ profilePhotoUri });

  // ✅ NEW: helper that OTP verify can call once
  const applyOtpVerifyPayload = (payload = {}) => {
    const p = payload || {};
    setWeddingDataState((prev) =>
      normalize({
        ...prev,
        ...(p.phone ? { phone: String(p.phone).trim() } : {}),
        ...(p.weddingId ? { weddingId: String(p.weddingId).trim() } : {}),
        ...(p.albums ? { albums: p.albums } : {}),
        ...(p.profilePhotoUri ? { profilePhotoUri: String(p.profilePhotoUri).trim() } : {}),
        ...(p.brideName ? { brideName: p.brideName } : {}),
        ...(p.groomName ? { groomName: p.groomName } : {}),
        ...(p.weddingDate ? { weddingDate: p.weddingDate } : {}),
        ...(typeof p.hasCompletedWeddingSetup === 'boolean'
          ? { hasCompletedWeddingSetup: p.hasCompletedWeddingSetup }
          : {}),
      })
    );
  };

  // ✅ NEW: get numeric album id instantly
  const getDefaultAlbumId = (kind) => {
    const k = String(kind || '').toLowerCase().trim();
    const v =
      k === 'engagement'
        ? weddingData?.albums?.engagement?.albumId
        : weddingData?.albums?.wedding?.albumId;

    return isNumericId(v) ? String(v).trim() : '';
  };

  // -------------------------
  // ✅ BACKEND INTEGRATION
  // -------------------------

  const getAuthHeaders = async () => {
    const token = await getAuthToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchWeddingFromBackend = async ({ weddingId, phone } = {}) => {
    if (!API_BASE) {
      return { ok: false, reason: 'missing_api_base' };
    }

    const wid = String(weddingId ?? weddingData.weddingId ?? '').trim();
    const ph = String(phone ?? weddingData.phone ?? '').trim();

    if (!wid && !ph) {
      return { ok: false, reason: 'missing_identifiers' };
    }

    if (inFlightRef.current) return { ok: false, reason: 'in_flight' };
    inFlightRef.current = true;
    setSyncing(true);
    setSyncError('');

    try {
      const qs = wid ? `?weddingId=${encodeURIComponent(wid)}` : `?phone=${encodeURIComponent(ph)}`;
      const url = `${API_BASE}${ENDPOINTS.getWedding}${qs}`;

      const res = await fetch(url, { method: 'GET', headers: await getAuthHeaders() });
      const data = await safeJson(res);

      if (!res.ok) {
        const msg = (data && (data.error?.message || data.message)) || `Fetch failed (${res.status})`;
        setSyncError(msg);
        return { ok: false, status: res.status, error: msg };
      }

      const payload = data?.data ?? data ?? {};
      // profilePhotoUri is client-only (per-phone AsyncStorage); never let backend overwrite it
      const { profilePhotoUri: _ignored, ...safePayload } = payload;
      setWeddingDataState((prev) => normalize({ ...prev, ...safePayload }));
      return { ok: true, data: payload };
    } catch (e) {
      const msg = String(e?.message || e || 'Network error');
      setSyncError(msg);
      return { ok: false, error: msg };
    } finally {
      inFlightRef.current = false;
      setSyncing(false);
    }
  };

  const saveWeddingToBackend = async (partial = null) => {
    if (!API_BASE) return { ok: false, reason: 'missing_api_base' };

    const wid = String(weddingData.weddingId || '').trim();
    const ph = String(weddingData.phone || '').trim();

    if (!wid && !ph) return { ok: false, reason: 'missing_identifiers' };

    if (inFlightRef.current) return { ok: false, reason: 'in_flight' };
    inFlightRef.current = true;
    setSyncing(true);
    setSyncError('');

    try {
      const body = normalize({ ...weddingData, ...(partial || {}) });

      const qs = wid ? `?weddingId=${encodeURIComponent(wid)}` : `?phone=${encodeURIComponent(ph)}`;
      const url = `${API_BASE}${ENDPOINTS.patchWedding}${qs}`;

      const res = await fetch(url, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg = (data && (data.error?.message || data.message)) || `Save failed (${res.status})`;
        setSyncError(msg);
        return { ok: false, status: res.status, error: msg };
      }

      const payload = data?.data ?? data ?? null;
      if (payload && typeof payload === 'object') {
        setWeddingDataState((prev) => normalize({ ...prev, ...payload }));
      }

      return { ok: true, data: payload };
    } catch (e) {
      const msg = String(e?.message || e || 'Network error');
      setSyncError(msg);
      return { ok: false, error: msg };
    } finally {
      inFlightRef.current = false;
      setSyncing(false);
    }
  };

  const setWeddingAndSync = async (partial) => {
    setWeddingData(partial);
    return await saveWeddingToBackend(partial);
  };

  const phone = weddingData.phone;
  const weddingId = weddingData.weddingId;
  const brideName = weddingData.brideName;
  const groomName = weddingData.groomName;
  const weddingDate = weddingData.weddingDate;
  const hasCompletedWeddingSetup = !!weddingData.hasCompletedWeddingSetup;

  // ✅ NEW: expose photo everywhere
  const profilePhotoUri = weddingData.profilePhotoUri;

  const value = useMemo(
    () => ({
      weddingData,
      hydrated,

      // values
      phone,
      weddingId,
      brideName,
      groomName,
      weddingDate,
      hasCompletedWeddingSetup,
      profilePhotoUri,

      // setters
      setWeddingData,
      setPhone,
      setWeddingId,
      setBrideName,
      setGroomName,
      setWeddingDate,
      setWeddingSlug,
      setHasCompletedWeddingSetup,
      setProfilePhotoUri,

      // reset
      resetWedding,

      // backend integration
      syncing,
      syncError,
      fetchWeddingFromBackend,
      saveWeddingToBackend,
      setWeddingAndSync,

      // helpers
      getDefaultAlbumId,
      applyOtpVerifyPayload,
    }),
    [weddingData, hydrated, syncing, syncError]
  );

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
};

export const useWedding = () => {
  const ctx = useContext(WeddingContext);
  if (!ctx) throw new Error('useWedding must be used inside WeddingProvider');
  return ctx;
};