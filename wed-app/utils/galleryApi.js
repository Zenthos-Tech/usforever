import { API_URL } from './api';
import { getAuthToken } from './authToken';

export function getApiBase() {
  const base = String(API_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('Missing API_URL');
  if (base.endsWith('/api')) return base;
  return `${base}/api`;
}

export async function apiFetch(path, options = {}) {
  const baseApi = getApiBase();
  const p = String(path || '').startsWith('/') ? String(path) : `/${String(path)}`;
  const url = `${baseApi}${p}`;

  const token = await getAuthToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const raw = await res.text();

  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  if (!res.ok) return { ok: false, url, status: res.status, body: json ?? raw };
  return { ok: true, url, status: res.status, json: json ?? raw };
}

export async function rawFetchAbsolute(url, options) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!res.ok) return { ok: false, url, status: res.status, body: json ?? raw };
  return { ok: true, url, status: res.status, json: json ?? raw };
}
