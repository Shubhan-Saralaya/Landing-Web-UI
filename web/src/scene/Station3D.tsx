import { Canvas, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Stars } from '@react-three/drei';
import type { StationProps } from '../types';
import { projects } from '../data/projects';
import { colors } from './materials';
import { JUNCTION_X, SHIPS, faceDist } from './layout';
import { Selectable } from './Selectable';
import { MainShip } from './MainShip';
import { ProjectShip } from './ProjectShip';
import { HomeShip } from './HomeShip';
import { Corridor, HexArray, Module, Strut } from './parts';
import { Asteroids, Nebula, Planet, Shuttle } from './Environment';
import { CameraRig } from './CameraRig';

const HUB_FACE = faceDist(2.3);
const JUNCTION_R = 0.85;
const SIDE_FACE = faceDist(1.5);

/** Junction module part-way along an X arm, with solar arrays fore and aft. */
function Junction({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Module radius={JUNCTION_R} height={0.65} accent={colors.cyan} />
      {[1, -1].map((s) => (
        <group key={s}>
          <Strut from={[0, 0, s * 0.8]} to={[0, 0, s * 1.5]} />
          <HexArray position={[0, 0.05, s * 2.2]} rotation={[s * 0.3, 0, 0]} size={0.36} />
        </group>
      ))}
    </group>
  );
}

function Scene({ focus, onSelect, locked, homeserver }: StationProps) {
  const { size } = useThree();
  // On portrait screens, turn the station so its long axis runs into the screen instead of across it.
  const yaw = size.width / size.height < 0.8 ? -Math.PI / 2 : 0;
  const overview = focus === 'overview';

  return (
    <>
      <color attach="background" args={['#04030c']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 16, 10]} intensity={2.4} color="#e4ecff" />
      <pointLight position={[0, -12, 6]} intensity={1.2} decay={0} color="#7a5cff" />
      <Stars radius={150} depth={60} count={6000} factor={4} saturation={0.2} fade speed={0.4} />
      <Nebula />
      <Planet />

      <group rotation={[0, yaw, 0]}>
        <Selectable
          position={SHIPS.main.position}
          label="Main ship"
          sub="Portfolio"
          showLabel={overview}
          labelHeight={3.4}
          onSelect={() => onSelect('main')}
        >
          <MainShip />
        </Selectable>

        <Selectable
          position={SHIPS.projects.position}
          label="Shipyard"
          sub="Projects · coming soon"
          tone="amber"
          showLabel={overview}
          labelHeight={3.2}
          onSelect={() => onSelect('projects')}
        >
          <ProjectShip count={projects.length} />
        </Selectable>

        <Selectable
          position={SHIPS.homeserver.position}
          label="Homeserver"
          sub={locked ? 'Restricted sector' : 'Clearance granted'}
          tone={locked ? 'red' : 'cyan'}
          showLabel={overview}
          labelHeight={3.2}
          onSelect={() => onSelect('homeserver')}
        >
          <HomeShip locked={locked} data={homeserver} focused={focus === 'homeserver'} />
        </Selectable>

        {[-1, 1].map((s) => (
          <group key={s}>
            <Corridor from={[s * HUB_FACE, 0, 0]} to={[s * (JUNCTION_X - faceDist(JUNCTION_R)), 0, 0]} />
            <Junction x={s * JUNCTION_X} />
            <Corridor
              from={[s * (JUNCTION_X + faceDist(JUNCTION_R)), 0, 0]}
              to={[s * (Math.abs(SHIPS.homeserver.position[0]) - SIDE_FACE), 0, 0]}
              accent={s < 0 ? colors.amber : colors.cyan}
              sealed={s > 0 && locked}
            />
          </group>
        ))}

        <Asteroids />
        <Shuttle />
      </group>

      <CameraRig focus={focus} yaw={yaw} />
      <AdaptiveDpr pixelated />
    </>
  );
}

export default function Station3D(props: StationProps) {
  return (
    <Canvas
      className="scene"
      camera={{ position: [0, 60, 90], fov: 45, near: 0.1, far: 700 }}
      dpr={[1, 2]}
      onPointerMissed={() => props.onSelect('overview')}
    >
      <Scene {...props} />
    </Canvas>
  );
}
