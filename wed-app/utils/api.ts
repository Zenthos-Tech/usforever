// Resolve the backend base URL from build-time env vars.
// Set EXPO_PUBLIC_API_BASE_URL (preferred) or EXPO_PUBLIC_API_URL in your
// EAS profile / .env so production builds don't ship a dev tunnel URL.
const RAW_BASE = String(
  process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    ''
)
  .trim()
  .replace(/\/+$/, '');

export const API_URL = RAW_BASE ? `${RAW_BASE}/api` : '';

if (!API_URL && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    '[api] EXPO_PUBLIC_API_BASE_URL is not set — network calls will fail. ' +
      'Add it to .env or your EAS build profile.'
  );
}
