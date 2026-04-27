import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export function useLayoutTokens() {
  const { width: W, height: H } = useWindowDimensions();

  return useMemo(() => {
    const short = Math.min(W, H);

    const gutter = clamp(short * 0.06, 16, 28);
    const contentMaxW = 420;

    const v1 = clamp(H * 0.012, 8, 14);
    const v2 = clamp(H * 0.02, 14, 22);
    const v3 = clamp(H * 0.03, 18, 30);

    const radius = clamp(short * 0.04, 12, 18);

    return { W, H, short, gutter, contentMaxW, v1, v2, v3, radius };
  }, [W, H]);
}
