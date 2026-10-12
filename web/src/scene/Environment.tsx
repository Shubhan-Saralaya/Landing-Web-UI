// Backdrop and set dressing: nebula glow, planet, asteroid field, a cargo shuttle on patrol.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { colors, glowMat, mats } from './materials';

/** Deterministic PRNG so the asteroid field is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Asteroids({ count = 220 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);

  useLayoutEffect(() => {
    const rand = mulberry32(11);
    const o = new THREE.Object3D();
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 30; tries++) {
      const r = 6 + rand() * 34;
      const a = rand() * Math.PI * 2;
      const x = Math.cos(a) * r * 1.25;
      const z = Math.sin(a) * r * 0.85;
      const y = -7 + rand() * 9;
      // Keep the station's footprint clear (everything below y=-2.5 is fine).
      if (Math.abs(x) < 23 && Math.abs(z) < 8.5 && y > -2.5) continue;
      o.position.set(x, y, z);
      o.rotation.set(rand() * 6, rand() * 6, rand() * 6);
      const s = 0.06 + Math.pow(rand(), 3) * 0.75;
      o.scale.set(s, s * (0.5 + rand() * 0.7), s * (0.7 + rand() * 0.5));
      o.updateMatrix();
      mesh.current.setMatrixAt(placed++, o.matrix);
    }
    mesh.current.count = placed;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    group.current.position.y = Math.sin(clock.elapsedTime * 0.15) * 0.3;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4d4857" roughness={0.95} metalness={0.15} flatShading />
      </instancedMesh>
    </group>
  );
}

function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft additive glows placed behind the station *along the view direction* — the camera looks down at
 * ~40°, so "behind" is below and beyond, not straight back.
 */
export function Nebula() {
  const tex = useMemo(
    () => ({
      purple: glowTexture('rgba(150,80,255,0.55)', 'rgba(150,80,255,0)'),
      blue: glowTexture('rgba(50,110,255,0.5)', 'rgba(50,110,255,0)'),
      star: glowTexture('rgba(255,255,255,1)', 'rgba(190,150,255,0)'),
    }),
    [],
  );
  const glows: { pos: [number, number, number]; scale: [number, number]; map: THREE.Texture }[] = [
    { pos: [60, -150, -230], scale: [340, 240], map: tex.purple },
    { pos: [-90, -190, -200], scale: [300, 260], map: tex.blue },
    { pos: [150, -230, -150], scale: [240, 200], map: tex.purple },
    { pos: [70, -110, -260], scale: [22, 22], map: tex.star },
  ];
  return (
    <group>
      {glows.map((g, i) => (
        <sprite key={i} position={g.pos} scale={[g.scale[0], g.scale[1], 1]}>
          <spriteMaterial map={g.map} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

export function Planet() {
  return (
    <group position={[-120, -130, -110]}>
      <mesh>
        <sphereGeometry args={[60, 64, 64]} />
        <meshStandardMaterial color="#1e3c86" roughness={0.85} emissive="#081738" />
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[60, 64, 64]} />
        <meshBasicMaterial color="#4a8bff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

const ORBIT = { rx: 25, rz: 12, y: -3.2, speed: 0.025 };

/** Cargo hauler slowly circling below the station. */
export function Shuttle() {
  const ship = useRef<THREE.Group>(null!);
  const next = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * ORBIT.speed + 2;
    ship.current.position.set(Math.cos(t) * ORBIT.rx, ORBIT.y, Math.sin(t) * ORBIT.rz);
    next.set(Math.cos(t + 0.01) * ORBIT.rx, ORBIT.y, Math.sin(t + 0.01) * ORBIT.rz);
    ship.current.lookAt(next);
  });

  // Built along +Z (lookAt aims +Z at the target).
  return (
    <group ref={ship}>
      <mesh material={mats.hullDark}>
        <boxGeometry args={[0.7, 0.35, 2.6]} />
      </mesh>
      <mesh position={[0, 0.08, 1.45]} material={mats.hull}>
        <boxGeometry args={[0.5, 0.3, 0.5]} />
      </mesh>
      <mesh position={[0, 0.16, 1.71]} material={glowMat(colors.amber)}>
        <boxGeometry args={[0.36, 0.08, 0.02]} />
      </mesh>
      {[-0.55, 0, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.3, z]} material={mats.trim}>
          <boxGeometry args={[0.55, 0.28, 0.45]} />
        </mesh>
      ))}
      {[-0.28, 0.28].map((x) => (
        <group key={x} position={[x, 0, -1.4]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.hull}>
            <cylinderGeometry args={[0.13, 0.17, 0.35, 10]} />
          </mesh>
          <mesh position={[0, 0, -0.2]} material={glowMat(colors.cyan)}>
            <sphereGeometry args={[0.11, 10, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
