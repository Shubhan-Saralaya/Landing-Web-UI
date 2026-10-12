import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { dragState } from './cameraControl';
import * as THREE from 'three';
import type { Guest, HomeserverData } from '../types';
import { colors, homeLights, setHomePower } from './materials';
import { Corridor, Module, Strut } from './parts';
import { resolveLogoId } from './logos';
import { faceDist, type Vec3 } from './layout';
import { CORE_R, POD_R, ROOM_R, type HomeLayout } from './homeLayout';


interface Props {
  locked: boolean;
  data?: HomeserverData;
  /** Rooms and pods, from layoutHome(): node splitting and spacing live there. */
  layout: HomeLayout;
  /** Ship is focused: show node tags and let pods open their app. */
  focused: boolean;
  /** Name every service above its logo, not just the hovered one. */
  showServices: boolean;
}

/**
 * Proxmox reactor core; corridors fan out to one room per node; each guest is a pod docked to its room
 * (green = running). Visible to everyone; while locked the ship is powered down (dark lights, dim logos) and pods can't be opened.
 */
export function HomeShip({ locked, data, layout, focused, showServices }: Props) {
  const coreMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a1405', emissive: colors.proxmox, roughness: 0.35 }),
    [],
  );
  const cage = useRef<THREE.Mesh>(null!);
  // 0 = powered off (locked), 1 = fully lit (cleared); eased so the ship powers up and down.
  const power = useRef(locked ? 0 : 1);
  const [hovered, setHovered] = useState<number | null>(null);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    power.current = THREE.MathUtils.damp(power.current, locked ? 0 : 1, 2.5, dt);
    const p = power.current;
    setHomePower(p);
    coreMat.emissiveIntensity = p * (1.1 + Math.sin(t * 2) * 0.25) + 0.03;
    cage.current.visible = p > 0.05;
    (cage.current.material as THREE.MeshBasicMaterial).opacity = p;
    cage.current.rotation.y += dt * 0.5 * p;
    cage.current.rotation.x += dt * 0.2 * p;
  });

  return (
    <group>
      <Module radius={CORE_R} height={1.0} accent={colors.proxmox}
        domeMaterial={coreMat}
        windowMaterial={homeLights.proxmox}
        logo={{ id: 'proxmox', fill: 0.85, dim: locked }}
      >
        <mesh ref={cage} position={[0, 1.45, 0]}>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshBasicMaterial color={colors.proxmox} wireframe transparent toneMapped={false} />
        </mesh>
      </Module>
      {(focused || showServices) && (
        <Html position={[0, 2.3, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span className="scene-tag tone-proxmox">Proxmox{data ? ` · ${data.datacenter}` : ''}</span>
        </Html>
      )}

      {/* spine corridor, then one room per column slot with its pods fanned outward */}
      {layout.spineEnd > 0 && (
        <Corridor from={[faceDist(CORE_R), 0, 0]} to={[layout.spineEnd, 0, 0]} lights={homeLights.proxmox} />
      )}
      {layout.rooms.map((room) => {
        const pos: Vec3 = [room.x, 0, room.z];
        const faceZ = room.side * (ROOM_R * 0.92);
        return (
          <group key={room.key}>
            <Corridor from={[room.x, 0, 0]} to={[room.x, 0, room.z - faceZ]} lights={homeLights.proxmox} />
            <Module position={pos} radius={ROOM_R} height={0.9} accent={colors.cyan} windowMaterial={homeLights.cyan} />
            {(focused || showServices) && room.label && (
              <Html position={[room.x, 1.7, room.z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
                <span className="scene-tag">{room.label}</span>
              </Html>
            )}
            {room.pods.map((pod, j) => (
              <Pod
                key={pod.guest.vmid}
                guest={pod.guest}
                index={j}
                position={[pod.x, 0, pod.z]}
                anchor={[room.x, 0, room.z]}
                locked={locked}
                canOpen={focused}
                showName={showServices}
                hovered={hovered === pod.guest.vmid}
                onHover={setHovered}
              />
            ))}
          </group>
        );
      })}

    </group>
  );
}

interface PodProps {
  guest: Guest;
  index: number;
  position: Vec3;
  anchor: Vec3;
  locked: boolean;
  canOpen: boolean;
  showName: boolean;
  hovered: boolean;
  onHover: (vmid: number | null) => void;
}

/** One guest (LXC/VM) docked to its node's room. Hover shows its name; click opens it when cleared. */
function Pod({ guest, index, position, anchor, locked, canOpen, showName, hovered, onHover }: PodProps) {
  const running = guest.status === 'running';
  const logoId = resolveLogoId(guest.name, guest.logo);
  const openable = canOpen && !!guest.url;
  const [x, , z] = position;
  const [ax, , az] = anchor;
  const dx = x - ax;
  const dz = z - az;
  const dist = Math.hypot(dx, dz);
  const k = (dist - POD_R) / dist;
  const end: Vec3 = [ax + dx * k, 0, az + dz * k];

  return (
    <group>
      <Strut from={anchor} to={end} radius={0.06} />
      <group
        position={position}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(guest.vmid);
          document.body.style.cursor = openable ? 'pointer' : locked ? 'not-allowed' : 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          if (!openable) return; // falls through to the ship: focuses it
          e.stopPropagation();
          if (dragState.moved) return;
          window.open(guest.url, '_blank', 'noopener,noreferrer');
        }}
        scale={hovered ? 1.2 : 1}
      >
        <Module
          radius={POD_R}
          height={0.4}
          accent={running ? colors.green : colors.grey}
          windowMaterial={running ? homeLights.green : homeLights.grey}
          logo={logoId ? { id: logoId, dim: !running || locked, fill: 0.85 } : undefined}
        />
        {/* Services toggle: every service is named above its logo; hover adds status. */}
        {(hovered || showName) && (
          <Html
            position={[0, hovered ? 1.15 : 0.85 + (index % 2) * 0.4, 0]}
            center
            zIndexRange={[hovered ? 7 : 5, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <span className={`scene-tag pod-tag${running ? ' is-on' : ''}`}>
              {guest.name}
              {hovered && (
                <span className="pod-tag-meta">
                  {running ? 'online' : 'offline'}
                  {locked ? ' · locked' : openable ? ' · open ↗' : ''}
                </span>
              )}
            </span>
          </Html>
        )}
      </group>
    </group>
  );
}
