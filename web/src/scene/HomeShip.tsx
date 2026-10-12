import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Guest, HomeserverData, PveNode } from '../types';
import { colors } from './materials';
import { Beacon } from './Beacon';
import { Corridor, Module, Strut } from './parts';
import { fanAngles, faceDist, polar, type Vec3 } from './layout';

// Only used when the server is unreachable — two anonymous rooms with no pods.
const SEALED_ROOMS: PveNode[] = [
  { id: 'sealed-a', name: '', guests: [] },
  { id: 'sealed-b', name: '', guests: [] },
];

const CORE_R = 1.5;
const ROOM_R = 1.0;
const ROOM_DIST = 4.2;
const POD_R = 0.34;
const POD_DIST = 2.0;
const POD_STEP = 0.55;

interface Props {
  locked: boolean;
  data?: HomeserverData;
  /** Ship is focused: show node tags and let pods open their app. */
  focused: boolean;
}

/**
 * Proxmox reactor core; corridors fan out to one room per node; each guest is a pod docked to its room
 * (green = running). Visible to everyone; while locked a force field surrounds it and pods can't be opened.
 */
export function HomeShip({ locked, data, focused }: Props) {
  const coreMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a1405', emissive: colors.proxmox, roughness: 0.35 }),
    [],
  );
  const cage = useRef<THREE.Mesh>(null!);
  const shield = useRef<THREE.Group>(null!);
  const shieldLines = useRef<THREE.MeshBasicMaterial>(null!);
  const shieldFill = useRef<THREE.MeshBasicMaterial>(null!);
  const level = useRef(locked ? 1 : 0);
  const [hovered, setHovered] = useState<number | null>(null);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    coreMat.emissiveIntensity = (locked ? 0.45 : 1.1) + Math.sin(t * 2) * 0.25;
    cage.current.rotation.y += dt * 0.5;
    cage.current.rotation.x += dt * 0.2;

    level.current = THREE.MathUtils.damp(level.current, locked ? 1 : 0, 2.5, dt);
    const l = level.current;
    shield.current.visible = l > 0.01;
    shield.current.rotation.y += dt * 0.08;
    shield.current.scale.set(1 + (1 - l) * 0.4, 0.42 * (1 + (1 - l) * 0.4), 1 + (1 - l) * 0.4);
    shieldLines.current.opacity = l * (0.28 + 0.1 * Math.sin(t * 3));
    shieldFill.current.opacity = l * 0.06;
  });

  const nodes = data?.nodes ?? SEALED_ROOMS;
  const roomAngles = fanAngles(nodes.length, 0, Math.PI / 2);

  return (
    <group>
      <Module radius={CORE_R} height={1.0} accent={colors.proxmox} domeMaterial={coreMat}>
        <mesh ref={cage} position={[0, 1.45, 0]}>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshBasicMaterial color={colors.proxmox} wireframe toneMapped={false} />
        </mesh>
      </Module>
      {focused && (
        <Html position={[0, 2.3, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span className="scene-tag tone-proxmox">Proxmox{data ? ` · ${data.datacenter}` : ''}</span>
        </Html>
      )}

      {nodes.map((node, i) => {
        const a = roomAngles[i];
        const room = polar(a, ROOM_DIST);
        const podAngles = fanAngles(node.guests.length, a, Math.min((node.guests.length - 1) * POD_STEP, Math.PI * 1.5));
        return (
          <group key={node.id}>
            <Corridor from={polar(a, faceDist(CORE_R))} to={polar(a, ROOM_DIST - faceDist(ROOM_R))} accent={colors.proxmox} />
            <Module position={room} radius={ROOM_R} height={0.75} accent={colors.cyan} />
            {focused && node.name && (
              <Html position={[room[0], 1.35, room[2]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
                <span className="scene-tag">{node.name}</span>
              </Html>
            )}
            {node.guests.map((g, j) => (
              <Pod
                key={g.vmid}
                guest={g}
                position={polar(podAngles[j], POD_DIST, room)}
                anchor={polar(podAngles[j], ROOM_R * 0.9, room)}
                locked={locked}
                canOpen={focused}
                hovered={hovered === g.vmid}
                onHover={setHovered}
              />
            ))}
          </group>
        );
      })}

      {/* force field, centred over the fan of rooms */}
      <group ref={shield} position={[2.6, 0, 0]}>
        <mesh>
          <icosahedronGeometry args={[5.6, 2]} />
          <meshBasicMaterial ref={shieldLines} color={colors.red} wireframe transparent toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[5.5, 32, 32]} />
          <meshBasicMaterial ref={shieldFill} color={colors.red} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {locked &&
        [0, 1, 2, 3].map((i) => {
          const [x, , z] = polar((i * Math.PI) / 2 + Math.PI / 4, CORE_R * 1.05);
          return <Beacon key={i} position={[x, 0.65, z]} color={colors.red} speed={4} phase={i % 2 ? Math.PI : 0} size={0.08} />;
        })}
    </group>
  );
}

interface PodProps {
  guest: Guest;
  position: Vec3;
  anchor: Vec3;
  locked: boolean;
  canOpen: boolean;
  hovered: boolean;
  onHover: (vmid: number | null) => void;
}

/** One guest (LXC/VM) docked to its node's room. Hover shows its name; click opens it when cleared. */
function Pod({ guest, position, anchor, locked, canOpen, hovered, onHover }: PodProps) {
  const running = guest.status === 'running';
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
          window.open(guest.url, '_blank', 'noopener,noreferrer');
        }}
        scale={hovered ? 1.2 : 1}
      >
        <Module radius={POD_R} height={0.32} accent={running ? colors.green : colors.grey} />
        {hovered && (
          <Html position={[0, 0.8, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
            <span className={`scene-tag pod-tag${running ? ' is-on' : ''}`}>
              {guest.name}
              <span className="pod-tag-meta">
                {running ? 'online' : 'offline'}
                {locked ? ' · locked' : openable ? ' · open ↗' : ''}
              </span>
            </span>
          </Html>
        )}
      </group>
    </group>
  );
}
