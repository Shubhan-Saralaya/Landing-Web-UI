import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { Vec3 } from './layout';

interface Props {
  position: Vec3;
  color: string;
  speed?: number;
  phase?: number;
  size?: number;
}

/** Small blinking navigation light. */
export function Beacon({ position, color, speed = 2, phase = 0, size = 0.08 }: Props) {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => {
    const t = (Math.sin(clock.elapsedTime * speed + phase) + 1) / 2;
    mat.current.opacity = 0.15 + 0.85 * t * t;
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial ref={mat} color={color} transparent toneMapped={false} />
    </mesh>
  );
}
