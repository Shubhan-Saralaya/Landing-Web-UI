import { useCallback, useState } from 'react';

export type RenderMode = '3d' | '2d';
const STORAGE_KEY = 'station.renderMode';

/** Can this device comfortably run the 3D station? Otherwise we start in the 2D view. */
function supports3D(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const canvas = document.createElement('canvas');
    if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) return false;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    return cores > 2 && memory > 2;
  } catch {
    return false;
  }
}

function readStored(): RenderMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === '3d' || v === '2d' ? v : null;
  } catch {
    return null;
  }
}

export function useRenderMode() {
  const [mode, setModeState] = useState<RenderMode>(() => readStored() ?? (supports3D() ? '3d' : '2d'));

  const setMode = useCallback((next: RenderMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — keep the choice for this visit only */
    }
  }, []);

  return [mode, setMode] as const;
}
