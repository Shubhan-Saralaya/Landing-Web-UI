import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import type { Vec3 } from './layout';

interface Props {
  position: Vec3;
  label: string;
  sub: string;
  tone?: 'cyan' | 'amber' | 'red';
  showLabel: boolean;
  labelHeight: number;
  onSelect: () => void;
  children: ReactNode;
}

/** Wraps a ship: hover grows it slightly, click selects it, and a floating label shows in the overview. */
export function Selectable({ position, label, sub, tone = 'cyan', showLabel, labelHeight, onSelect, children }: Props) {
  const group = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const goal = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useCursor(hovered);

  useFrame((_, dt) => {
    goal.setScalar(hovered ? 1.06 : 1);
    group.current.scale.lerp(goal, 1 - Math.exp(-dt * 8));
  });

  return (
    <group position={position}>
      <group
        ref={group}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {children}
      </group>
      {showLabel && (
        <Html position={[0, labelHeight, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`ship-label tone-${tone}${hovered ? ' is-hovered' : ''}`}>
            <span className="ship-label-name">{label}</span>
            <span className="ship-label-sub">{sub}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
