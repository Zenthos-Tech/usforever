import { router } from 'expo-router';

export function safeBack(fallback = '/profile') {
  try {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  } catch {
    router.replace(fallback);
  }
}