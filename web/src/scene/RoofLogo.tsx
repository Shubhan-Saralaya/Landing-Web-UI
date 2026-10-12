import { useMemo } from 'react';
import * as THREE from 'three';
import { LOGOS } from './logos';

const TEX_PX = 256;
const textures = new Map<string, THREE.CanvasTexture>();

/** White glyph on transparent, drawn once per logo; tinted per use through the material colour. */
function glyphTexture(id: string): THREE.CanvasTexture | null {
  const cached = textures.get(id);
  if (cached) return cached;
  const logo = LOGOS[id];
  if (!logo || typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const pad = TEX_PX * 0.1;
  const scale = (TEX_PX - pad * 2) / 24;
  ctx.translate(pad, pad);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(logo.path), 'evenodd');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textures.set(id, tex);
  return tex;
}

interface Props {
  id: string;
  /** Radius of the dome this sits on (before the module's vertical squash). */
  domeRadius: number;
  /** Width of the logo as a fraction of the dome's diameter. */
  fill?: number;
  /** Offline services are painted over in grey. */
  dim?: boolean;
}

/**
 * A logo painted onto the top of a dome: a thin spherical cap that hugs the surface, with planar UVs so
 * the glyph reads upright from the overhead camera. Render inside the module's (squashed) dome group.
 */
export function RoofLogo({ id, domeRadius, fill = 0.7, dim = false }: Props) {
  const logo = LOGOS[id];
  const map = useMemo(() => glyphTexture(id), [id]);

  const geometry = useMemo(() => {
    const R = domeRadius * 1.006; // sits just above the plating
    const half = domeRadius * fill; // half-width of the logo square
    const theta = Math.min(1.2, Math.asin(Math.min(1, (half * Math.SQRT2) / R))); // wide enough for the square, but never down the steep rim
    const g = new THREE.SphereGeometry(R, 32, 6, 0, Math.PI * 2, 0, theta);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      // Screen-right is +x and screen-up is -z for the overhead camera.
      uv.setXY(i, pos.getX(i) / (half * 2) + 0.5, 0.5 - pos.getZ(i) / (half * 2));
    }
    return g;
  }, [domeRadius, fill]);

  if (!logo || !map) return null;
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        map={map}
        color={dim ? '#6b7280' : logo.color}
        transparent
        opacity={dim ? 0.75 : 0.95}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  );
}
