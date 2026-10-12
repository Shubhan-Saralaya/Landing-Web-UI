/**
 * Manual camera state shared between the canvas (CameraRig reads it every frame) and the HTML
 * overlay (CameraControls drives it). Kept free of three/fiber imports so the overlay stays in the main chunk.
 */

export interface View {
  az: number; // radians around the focus
  polar: number; // offset from the default tilt
  zoom: number; // multiplier on the auto-framed distance
}

export const ZOOM_RANGE: [number, number] = [0.35, 1.8];

const HOME: View = { az: 0, polar: 0, zoom: 1 };
let goal: View = { ...HOME };
let version = 0;
const listeners = new Set<() => void>();

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

/** Mutable target the camera eases toward. Call `changed()` after writing zoom so sliders update. */
export const getGoal = () => goal;
export const changed = emit;

/** 2D view only: how far the picture has been dragged, in SVG units. */
export const pan2d = { x: 0, y: 0 };

export function reset() {
  goal = { ...HOME };
  pan2d.x = 0;
  pan2d.y = 0;
  emit();
}

export function setZoom(zoom: number) {
  goal.zoom = Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], zoom));
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const getVersion = () => version;

/**
 * How far the homeserver ship extends from its core (+x reach, ±z half-depth), set by Station3D from the
 * current layout so the camera can frame a ship that grows as services are added.
 */
export const homeBounds = { reachX: 9, halfZ: 8.3 };

/** Set during/after a pointer drag so click handlers can ignore the click that ends an orbit. */
export const dragState = { moved: false };
