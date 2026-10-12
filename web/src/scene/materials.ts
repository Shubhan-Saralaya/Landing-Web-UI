import * as THREE from 'three';

export const colors = {
  cyan: '#4fe3ff',
  amber: '#ffb547',
  red: '#ff4d4d',
  proxmox: '#ff7a1a',
  green: '#3dff9a',
  grey: '#4b515c',
};

// Shared across the station so each material compiles once.
export const mats = {
  hull: new THREE.MeshStandardMaterial({ color: '#8a93a3', metalness: 0.75, roughness: 0.4 }),
  hullDark: new THREE.MeshStandardMaterial({ color: '#2f3540', metalness: 0.8, roughness: 0.5 }),
  trim: new THREE.MeshStandardMaterial({ color: '#b8673a', metalness: 0.6, roughness: 0.45 }),
  panel: new THREE.MeshStandardMaterial({
    color: '#1d3a9a',
    metalness: 0.6,
    roughness: 0.2,
    emissive: '#0a1a5a',
    emissiveIntensity: 0.9,
  }),
  sealed: new THREE.MeshBasicMaterial({ color: colors.red, toneMapped: false }),
  scaffold: new THREE.MeshBasicMaterial({ color: colors.amber, wireframe: true, transparent: true, opacity: 0.25 }),
  ghost: new THREE.MeshBasicMaterial({ color: '#ffd28a', wireframe: true, transparent: true, opacity: 0.22 }),
};

const glowCache = new Map<string, THREE.MeshBasicMaterial>();

/** Unlit, tone-mapping-free material for windows and lights, cached per colour. */
export function glowMat(color: string) {
  let m = glowCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    glowCache.set(color, m);
  }
  return m;
}
