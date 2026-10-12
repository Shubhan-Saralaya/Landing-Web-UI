import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { colors, mats } from './materials';
import { Beacon } from './Beacon';
import { Module } from './parts';
import { fanAngles, faceDist, polar } from './layout';

const CORE_R = 1.4;
const SLOT_DIST = 3.6;

/** Shipyard: a module with an unfinished dome inside scaffolding; each upcoming project is a ghosted module. */
export function ProjectShip({ count }: { count: number }) {
  const crane = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    crane.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 1.2;
  });

  // Fan away from the hub (which is toward +X).
  const angles = fanAngles(count, Math.PI, Math.min(Math.PI * 1.1, (count - 1) * 0.9));

  return (
    <group>
      <Module radius={CORE_R} height={0.9} accent={colors.amber} dome="wire" />
      <mesh position={[0, 0.5, 0]} material={mats.scaffold}>
        <boxGeometry args={[3.6, 2.4, 3.6, 4, 3, 4]} />
      </mesh>

      {angles.map((a, i) => {
        const [x, , z] = polar(a, SLOT_DIST);
        const stub = SLOT_DIST - faceDist(CORE_R) - 0.75;
        const [sx, , sz] = polar(a, faceDist(CORE_R) + stub / 2);
        return (
          <group key={i}>
            <mesh position={[sx, 0, sz]} rotation={[0, -a, 0]} material={mats.ghost}>
              <boxGeometry args={[stub, 0.4, 0.5]} />
            </mesh>
            <mesh position={[x, 0, z]} rotation={[0, Math.PI / 8, 0]} material={mats.ghost}>
              <cylinderGeometry args={[0.75, 0.75, 0.6, 8]} />
            </mesh>
            <Beacon position={[x, 0.45, z]} color={colors.amber} speed={2.5} phase={i * 1.7} size={0.06} />
          </group>
        );
      })}

      <group ref={crane} position={[0, 1.75, 0]}>
        <mesh material={mats.hullDark}>
          <boxGeometry args={[0.1, 0.1, 3.2]} />
        </mesh>
        <mesh position={[0, -0.45, 1.5]} material={mats.hullDark}>
          <boxGeometry args={[0.04, 0.9, 0.04]} />
        </mesh>
        <Beacon position={[0, 0.12, 1.6]} color={colors.amber} speed={5} />
      </group>

      {[
        [1.8, 1.7, 1.8],
        [-1.8, 1.7, -1.8],
        [1.8, -0.7, -1.8],
        [-1.8, -0.7, 1.8],
      ].map((p, i) => (
        <Beacon key={i} position={p as [number, number, number]} color={colors.amber} speed={3} phase={i * 1.3} size={0.07} />
      ))}
    </group>
  );
}
