import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL } from '../utils/api';

const AUTH_TOKEN_KEY = 'USFOREVER_AUTH_TOKEN_V1';
const TV_POLL_INTERVAL_MS = 8000;

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * TV connection state backed entirely by the backend.
 * No local storage — state is per-user and survives remounts.
 */
export function useTvConnection(weddingId) {
  const [tvConnected, setTvConnected] = useState(false);
  const [showTVModal, setShowTVModal] = useState(false);
  const [showTVSuccess, setShowTVSuccess] = useState(false);
  const pairedIdRef = useRef(null);
  const checkedRef = useRef(false);
  const disconnectedRef = useRef(false);

  // Check backend for active TV session and update state
  const checkActive = useCallback(async (wid) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/tv/pair/active?weddingId=${encodeURIComponent(wid)}`,
        { headers }
      );
      const json = await res.json();
      if (res.ok && json?.active && !disconnectedRef.current) {
        pairedIdRef.current = json.pairingId;
        setTvConnected(true);
      } else if (!json?.active) {
        // Session gone (TV logged out or expired)
        pairedIdRef.current = null;
        disconnectedRef.current = false;
        setTvConnected(false);
        setShowTVSuccess(false);
      }
    } catch (_) {}
  }, []);

  // On mount: initial check
  useEffect(() => {
    if (!weddingId || checkedRef.current) return;
    checkedRef.current = true;
    checkActive(weddingId);
  }, [weddingId, checkActive]);

  // Poll every 8s to detect TV-side logout. Pause polling when the app is
  // backgrounded so we don't burn battery / API quota while invisible.
  useEffect(() => {
    if (!weddingId) return;

    let interval = null;
    const start = () => {
      if (interval) return;
      checkActive(weddingId);
      interval = setInterval(() => checkActive(weddingId), TV_POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [weddingId, checkActive]);

  const onConnected = useCallback(async (pid) => {
    disconnectedRef.current = false;
    pairedIdRef.current = pid;
    setTvConnected(true);
    setShowTVModal(false);
    setShowTVSuccess(true);
  }, []);

  const onDisconnect = useCallback(async () => {
    const pid = pairedIdRef.current;
    pairedIdRef.current = null;
    disconnectedRef.current = true;
    setTvConnected(false);
    setShowTVSuccess(false);

    if (pid) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/tv/pair/cancel`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pairingId: pid }),
        });
        const json = await res.json();
        console.log('[useTvConnection] cancel response:', res.status, json);
      } catch (err) {
        console.log('[useTvConnection] cancel error:', err.message);
      }
    } else {
      console.log('[useTvConnection] no pid — cancel API not called');
    }
  }, []);

  const onCastPress = useCallback(() => {
    setShowTVModal(true);
  }, []);

  return {
    tvConnected,
    showTVModal,
    showTVSuccess,
    setShowTVModal,
    setShowTVSuccess,
    onConnected,
    onDisconnect,
    onCastPress,
  };
}
