// Station building blocks: octagonal domed modules, windowed corridors, hex solar arrays, struts.

import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type GroupProps } from '@react-three/fiber';
import * as THREE from 'three';
import { colors, glowMat, mats } from './materials';
import type { Vec3 } from './layout';
import { Html } from '@react-three/drei';
import { RoofLogo } from './RoofLogo';

const FACES = 8;
const FACE_ANGLES = Array.from({ length: FACES }, (_, k) => (k * Math.PI * 2) / FACES);

interface ModuleProps extends GroupProps {
  radius?: number;
  height?: number;
  accent?: string;
  /** solid: plated dome · wire: unfinished frame · none: flat roof */
  dome?: 'solid' | 'wire' | 'none';
  /** Override the dome material (e.g. a glowing reactor). */
  domeMaterial?: THREE.Material;
  /** Override the window-band material (e.g. lights that can be powered down). */
  windowMaterial?: THREE.Material;
  /** Logo id (see logos.ts) painted on top of the dome; `dim` greys it out for offline services. */
  logo?: { id: string; dim?: boolean; fill?: number; /** Name floated above the logo while `showLabel` is set. */ label?: string; showLabel?: boolean };
  children?: ReactNode;
}

/** Octagonal pressurised module with a window band and a domed roof. Children sit in its local space. */
export function Module({
  radius = 1,
  height = 0.8,
  accent = colors.cyan,
  dome = 'solid',
  domeMaterial,
  windowMaterial,
  logo,
  children,
  ...props
}: ModuleProps) {
  const d = radius * Math.cos(Math.PI / FACES);
  const small = radius < 0.5;
  const domeR = radius * 0.82;
  const domeH = 0.6;
  const windowMat = windowMaterial ?? glowMat(accent);

  return (
    <group {...props}>
      {/* rotated π/8 so flat faces point along ±X/±Z */}
      <group rotation={[0, Math.PI / FACES, 0]}>
        <mesh position={[0, -height / 2 - 0.06, 0]} material={mats.hullDark}>
          <cylinderGeometry args={[radius * 1.06, radius * 0.9, 0.16, FACES]} />
        </mesh>
        <mesh material={mats.hull}>
          <cylinderGeometry args={[radius, radius, height, FACES]} />
        </mesh>
        <mesh position={[0, height / 2, 0]} material={mats.trim}>
          <cylinderGeometry args={[radius * 1.04, radius * 1.04, 0.06, FACES]} />
        </mesh>
      </group>

      {FACE_ANGLES.filter((_, k) => !small || k % 2 === 0).map((a) => (
        <mesh key={a} position={[Math.sin(a) * d, 0, Math.cos(a) * d]} rotation={[0, a, 0]} material={windowMat}>
          <boxGeometry args={[radius * 0.5, height * 0.26, 0.03]} />
        </mesh>
      ))}

      {dome !== 'none' && (
        <group position={[0, height / 2, 0]} scale={[1, domeH, 1]}>
          <mesh material={domeMaterial ?? (dome === 'wire' ? mats.scaffold : mats.hullDark)}>
            <sphereGeometry args={[domeR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {logo && <RoofLogo id={logo.id} domeRadius={domeR} dim={logo.dim} fill={logo.fill} />}
          {dome === 'solid' && !domeMaterial && (
            <mesh position={[0, domeR * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} material={windowMat}>
              <torusGeometry args={[domeR * 0.82, small ? 0.02 : 0.035, 6, 32]} />
            </mesh>
          )}
        </group>
      )}
      {logo?.label && logo.showLabel && dome !== 'none' && (
        <Html position={[0, height / 2 + domeR * domeH + 0.5, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span className="scene-tag">{logo.label}</span>
        </Html>
      )}
      {children}
    </group>
  );
}

const WINDOW_GAP = 0.55;
const PULSES = 2;

/** Flat corridor between two points on the XZ plane, lit windows on both sides; sealed shows a red airlock. */
export function Corridor({
  from,
  to,
  accent = colors.cyan,
  sealed = false,
  lights,
}: {
  from: Vec3;
  to: Vec3;
  accent?: string;
  sealed?: boolean;
  /** Overrides the window and pulse material, so a ship can power its corridors down. */
  lights?: THREE.Material;
}) {
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const { mid, length, yaw } = useMemo(() => {
    const dx = tx - fx;
    const dz = tz - fz;
    return {
      mid: [(fx + tx) / 2, (fy + ty) / 2, (fz + tz) / 2] as Vec3,
      length: Math.hypot(dx, dz),
      yaw: Math.atan2(-dz, dx),
    };
  }, [fx, fy, fz, tx, ty, tz]);

  const perSide = Math.max(1, Math.floor((length - 0.3) / WINDOW_GAP));
  const windows = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < perSide; i++) {
      const x = -((perSide - 1) * WINDOW_GAP) / 2 + i * WINDOW_GAP;
      for (const side of [-1, 1]) {
        o.position.set(x, 0.03, side * 0.27);
        o.updateMatrix();
        windows.current.setMatrixAt(k++, o.matrix);
      }
    }
    windows.current.instanceMatrix.needsUpdate = true;
  }, [perSide]);

  const ribs = Math.max(0, Math.floor(length / 1.8));
  const pulses = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    pulses.current.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.15 + i / PULSES) % 1;
      m.position.x = -length / 2 + (sealed ? t * 0.5 : t) * length;
    });
  });

  return (
    <group position={mid} rotation={[0, yaw, 0]}>
      <mesh material={mats.hull}>
        <boxGeometry args={[length, 0.4, 0.52]} />
      </mesh>
      <mesh position={[0, 0.21, 0]} material={mats.hullDark}>
        <boxGeometry args={[length, 0.04, 0.34]} />
      </mesh>
      {Array.from({ length: ribs }, (_, i) => (
        <mesh key={i} position={[-length / 2 + ((i + 1) * length) / (ribs + 1), 0, 0]} material={mats.hullDark}>
          <boxGeometry args={[0.14, 0.48, 0.6]} />
        </mesh>
      ))}
      <instancedMesh key={perSide} ref={windows} args={[undefined, undefined, perSide * 2]} material={lights ?? (sealed ? mats.sealed : glowMat(accent))}>
        <boxGeometry args={[0.28, 0.13, 0.02]} />
      </instancedMesh>
      {sealed && (
        <group>
          <mesh material={mats.hullDark}>
            <boxGeometry args={[0.4, 0.62, 0.74]} />
          </mesh>
          <mesh material={mats.sealed}>
            <boxGeometry args={[0.42, 0.08, 0.76]} />
          </mesh>
        </group>
      )}
      {Array.from({ length: PULSES }, (_, i) => (
        <mesh key={i} ref={(m) => m && (pulses.current[i] = m)} position={[0, 0.26, 0]} material={lights ?? glowMat(sealed ? colors.red : accent)}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/** Thin cylinder strut between two points (any direction). */
export function Strut({ from, to, radius = 0.05 }: { from: Vec3; to: Vec3; radius?: number }) {
  const { mid, length, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      length: dir.length(),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [...from, ...to]);
  return (
    <mesh position={mid} quaternion={quat} material={mats.hullDark}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
    </mesh>
  );
}

const HEX_CELLS: [number, number][] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0.5, 0.866],
  [-0.5, 0.866],
  [0.5, -0.866],
  [-0.5, -0.866],
];

/** Cluster of seven hexagonal solar panels on a short mast. */
export function HexArray({ size = 0.42, ...props }: GroupProps & { size?: number }) {
  const step = size * 2.05;
  return (
    <group {...props}>
      <mesh position={[0, -0.25, 0]} material={mats.hullDark}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
      </mesh>
      {HEX_CELLS.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x * step, 0, z * step]} rotation={[0, Math.PI / 6, 0]} material={mats.panel}>
          <cylinderGeometry args={[size, size, 0.04, 6]} />
        </mesh>
      ))}
    </group>
  );
}
