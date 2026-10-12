import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Focus } from '../types';
import { OVERVIEW, SHIPS, type Vec3 } from './layout';
import { ZOOM_RANGE, changed, dragState, getGoal, homeBounds, reset, type View } from './cameraControl';

// Looking down at the station from ~40° above, like a strategy-game camera.
const VIEW_DIR = new THREE.Vector3(0, 0.85, 1).normalize();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const MOBILE_BREAKPOINT = 768;
const SHEET_FRACTION = 0.58; // must match --sheet-h in styles.css
const PANEL_MAX_PX = 460; // must match --panel-w in styles.css
const CORE_EDGE = 2.5; // core radius plus a little air
const STATION_HALF_WIDTH = 9; // half the station's short (Z) extent incl. solar arrays
const BASE_POLAR = Math.acos(VIEW_DIR.y); // camera's default angle from straight up
const POLAR_RANGE: [number, number] = [0.2, 1.5]; // never flip over the top or dip under the station
const DRAG_THRESHOLD_PX = 6;


const SHIPYARD_REACH = 22; // how far the shipyard side extends left of the hub

/** Where to aim and how much to frame; the homeserver and the overview follow its current layout. */
function frameFor(focus: Focus): { focus: Vec3; radius: number } {
  const homeX = SHIPS.homeserver.position[0];
  const reach = homeX + homeBounds.reachX + 1.5; // right-most edge of the station
  if (focus === 'homeserver') {
    const left = homeX - CORE_EDGE;
    const radius = Math.max((reach - left) / 2, homeBounds.halfZ) + 0.8;
    return { focus: [(left + reach) / 2, 0, 0] , radius };
  }
  if (focus === 'overview') {
    return {
      focus: [(reach - SHIPYARD_REACH) / 2, 0, 0] ,
      radius: Math.max((reach + SHIPYARD_REACH) / 2 + 0.5, OVERVIEW.radius),
    };
  }
  return SHIPS[focus];
}

/**
 * Flies the camera to the focused ship and frames it in the part of the screen the panel leaves free:
 * left of the side panel on desktop, above the bottom sheet on mobile. `yaw` is the station's rotation
 * (portrait screens turn it 90°), so targets are rotated to match.
 */
export function CameraRig({ focus, yaw }: { focus: Focus; yaw: number }) {
  const { camera, size, pointer, gl } = useThree();
  const look = useRef(new THREE.Vector3(...OVERVIEW.focus));
  const goalLook = useMemo(() => new THREE.Vector3(), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  // The shared goal (cameraControl) is what input drives; `view` eases toward it and is what the camera uses.
  const view = useRef<View>({ az: 0, polar: 0, zoom: 1 });

  // A new focus re-frames the camera, so drop any manual orbit/zoom.
  useEffect(() => {
    reset();
  }, [focus]);

  // Drag (or one finger) orbits, wheel / pinch zooms, double-click resets.
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    const pointers = new Map<number, { x: number; y: number }>();
    let travelled = 0;
    let pinch = 0;

    const clampZoom = (z: number) => THREE.MathUtils.clamp(z, ...ZOOM_RANGE);
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        travelled = 0;
        dragState.moved = false;
      } else if (pointers.size === 2) {
        pinch = spread();
        dragState.moved = true; // a pinch is never a click
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, next);

      if (pointers.size >= 2) {
        const d = spread();
        if (pinch > 0 && d > 0) {
          getGoal().zoom = clampZoom(getGoal().zoom * (pinch / d));
          changed();
        }
        pinch = d;
        return;
      }
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      travelled += Math.abs(dx) + Math.abs(dy);
      if (travelled < DRAG_THRESHOLD_PX) return;
      dragState.moved = true;
      const g = getGoal();
      g.az -= dx * 0.006;
      g.polar = THREE.MathUtils.clamp(
        g.polar - dy * 0.005,
        POLAR_RANGE[0] - BASE_POLAR,
        POLAR_RANGE[1] - BASE_POLAR,
      );
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = pointers.size === 2 ? spread() : 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      getGoal().zoom = clampZoom(getGoal().zoom * Math.exp(e.deltaY * 0.001));
      changed();
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('dblclick', reset);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('dblclick', reset);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const { width: W, height: H } = size;
    const aspect = W / H;
    const target = frameFor(focus);
    goalLook.set(...target.focus).applyAxisAngle(Y_AXIS, yaw);

    // Ease the manual orbit toward its goal, then derive the camera's offset from the focus.
    const ease = 1 - Math.exp(-dt * 8);
    const v = view.current;
    const g = getGoal();
    v.az += (g.az - v.az) * ease;
    v.polar += (g.polar - v.polar) * ease;
    v.zoom += (g.zoom - v.zoom) * ease;

    let dist: number;
    if (focus === 'overview') {
      dist =
        yaw !== 0
          ? // Long axis runs into the screen: foreshortening lets it fit closer; width is the limit.
            Math.max((target.radius * 0.75) / tanHalf, STATION_HALF_WIDTH / (tanHalf * aspect))
          : target.radius / (tanHalf * Math.min(aspect, 1.6));
      dist *= 1.05;
    } else if (W < MOBILE_BREAKPOINT) {
      const freeH = 1 - SHEET_FRACTION;
      dist = Math.max(target.radius / (tanHalf * freeH), target.radius / (tanHalf * aspect)) * 1.3; // extra room for the top HUD
      // Free area centre sits (SHEET_FRACTION/2) of the screen height above screen centre.
      goalLook.y -= SHEET_FRACTION * dist * tanHalf;
    } else {
      const panel = Math.min(PANEL_MAX_PX, W * 0.42);
      dist = Math.max(target.radius / (tanHalf * ((W - panel) / H)), target.radius / tanHalf) * 1.05;
      // Shift along the camera's right vector so the framing holds while orbiting.
      const shift = (panel / W) * dist * tanHalf * aspect;
      goalLook.x += shift * Math.cos(v.az);
      goalLook.z -= shift * Math.sin(v.az);
    }
    dist *= v.zoom;

    const sway = focus === 'overview' ? 1 : 0.25;
    offset.setFromSphericalCoords(dist, BASE_POLAR + v.polar, v.az);
    goalPos.copy(goalLook).add(offset);
    goalPos.x += pointer.x * 1.6 * sway;
    goalPos.y += pointer.y * 0.9 * sway;

    const k = 1 - Math.exp(-dt * 2);
    camera.position.lerp(goalPos, k);
    look.current.lerp(goalLook, k);
    camera.lookAt(look.current);
  });

  return null;
}
