import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { colors, mats } from './materials';
import { Beacon } from './Beacon';
import { Corridor, HexArray, Module, Strut } from './parts';
import { faceDist } from './layout';
import { resolveLogoId } from './logos';
import type { SharedService } from '../data/shared';

const HUB_R = 2.3;
const ARM_MODULE_Z = 5.4;
const ARM_MODULE_R = 0.95;

function armLogo(service: SharedService | undefined, showLabel: boolean) {
  const id = service && resolveLogoId(service.name, service.logo);
  return id ? { id, fill: 0.85, label: service!.name, showLabel } : undefined;
}

/** Portfolio hub: big domed command module with short fore/aft arms ending in modules and solar arrays. */
/** Shared services put their logo on the hub: slots 0/1 are the fore/aft arm modules (2/3 are the junctions). */
export function MainShip({ showServices = false, services = [] }: { showServices?: boolean; services?: SharedService[] }) {
  const radar = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    radar.current.rotation.y += dt * 0.6;
  });

  return (
    <group>
      <Module radius={HUB_R} height={1.1} accent={colors.cyan}>
        <mesh position={[0, 1.55, 0]} material={mats.hullDark}>
          <cylinderGeometry args={[0.05, 0.09, 1.3, 6]} />
        </mesh>
        <Beacon position={[0, 2.25, 0]} color={colors.cyan} speed={2.5} />
        <group ref={radar} position={[1.1, 0.95, 0.5]}>
          <mesh position={[0, 0.15, 0]} material={mats.hullDark}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
          </mesh>
          <mesh position={[0, 0.35, 0]} rotation={[-0.7, 0, 0]} material={mats.hull}>
            <sphereGeometry args={[0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
          </mesh>
        </group>
      </Module>
      {/* lower deck */}
      <mesh position={[0, -0.85, 0]} rotation={[0, Math.PI / 8, 0]} material={mats.hullDark}>
        <cylinderGeometry args={[1.5, 1.0, 0.5, 8]} />
      </mesh>

      {[1, -1].map((s) => (
        <group key={s}>
          <Corridor from={[0, 0, s * faceDist(HUB_R)]} to={[0, 0, s * (ARM_MODULE_Z - faceDist(ARM_MODULE_R))]} />
          <Module
            position={[0, 0, s * ARM_MODULE_Z]}
            radius={ARM_MODULE_R}
            height={0.7}
            accent={colors.cyan}
            logo={armLogo(services[s > 0 ? 0 : 1], showServices)}
          />
          <Strut from={[0, 0, s * (ARM_MODULE_Z + 0.8)]} to={[0, 0, s * (ARM_MODULE_Z + 1.6)]} />
          <HexArray position={[0, 0.1, s * (ARM_MODULE_Z + 2.4)]} rotation={[s * 0.35, 0, 0]} />
          <Beacon position={[0.75, 0.55, s * ARM_MODULE_Z]} color={s > 0 ? colors.green : colors.red} speed={1.5} phase={s} />
        </group>
      ))}
    </group>
  );
}
