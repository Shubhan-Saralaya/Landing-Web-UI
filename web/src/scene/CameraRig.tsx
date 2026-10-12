import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Focus } from '../types';
import { OVERVIEW, SHIPS } from './layout';

// Looking down at the station from ~40° above, like a strategy-game camera.
const VIEW_DIR = new THREE.Vector3(0, 0.85, 1).normalize();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const MOBILE_BREAKPOINT = 768;
const SHEET_FRACTION = 0.58; // must match --sheet-h in styles.css
const PANEL_MAX_PX = 460; // must match --panel-w in styles.css
const STATION_HALF_WIDTH = 9; // half the station's short (Z) extent incl. solar arrays

/**
 * Flies the camera to the focused ship and frames it in the part of the screen the panel leaves free:
 * left of the side panel on desktop, above the bottom sheet on mobile. `yaw` is the station's rotation
 * (portrait screens turn it 90°), so targets are rotated to match.
 */
export function CameraRig({ focus, yaw }: { focus: Focus; yaw: number }) {
  const { camera, size, pointer } = useThree();
  const look = useRef(new THREE.Vector3(...OVERVIEW.focus));
  const goalLook = useMemo(() => new THREE.Vector3(), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const { width: W, height: H } = size;
    const aspect = W / H;
    const target = focus === 'overview' ? OVERVIEW : SHIPS[focus];
    goalLook.set(...target.focus).applyAxisAngle(Y_AXIS, yaw);

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
      goalLook.x += (panel / W) * dist * tanHalf * aspect;
    }

    const sway = focus === 'overview' ? 1 : 0.25;
    goalPos.copy(goalLook).addScaledVector(VIEW_DIR, dist);
    goalPos.x += pointer.x * 1.6 * sway;
    goalPos.y += pointer.y * 0.9 * sway;

    const k = 1 - Math.exp(-dt * 2);
    camera.position.lerp(goalPos, k);
    look.current.lerp(goalLook, k);
    camera.lookAt(look.current);
  });

  return null;
}
