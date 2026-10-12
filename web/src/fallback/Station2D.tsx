import { useEffect, useMemo, useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import type { Focus, StationProps } from '../types';
import { projects } from '../data/projects';
import { LOGOS, resolveLogoId } from '../scene/logos';
import { layoutHome, POD_R, ROOM_R } from '../scene/homeLayout';
import { sharedServices } from '../data/shared';
import { ZOOM_RANGE, changed, dragState, getGoal, getVersion, pan2d, reset, subscribe } from '../scene/cameraControl';

/** Scene units (homeLayout) -> SVG units. */
const K = 28;
const HOME_X = 450;
const SHIPYARD_LEFT = -700;
const DRAG_THRESHOLD_PX = 6;

/** A roof logo centred on (0,0) in a `size`-unit square; the caller positions it with a transform. */
function Logo({ id, size, dim = false }: { id: string; size: number; dim?: boolean }) {
  const logo = LOGOS[id];
  if (!logo) return null;
  const k = size / 24;
  return (
    <path
      d={logo.path}
      transform={`translate(${-size / 2} ${-size / 2}) scale(${k})`}
      fill={dim ? '#6b7280' : logo.color}
      fillRule="evenodd"
      opacity={dim ? 0.8 : 0.95}
      className="logo2d"
    />
  );
}

/** A shared service's logo (and name) on a hub module; renders nothing for an empty slot. */
function SharedLogo({
  service,
  size,
  nameY,
  show,
}: {
  service?: { name: string; logo?: Parameters<typeof resolveLogoId>[1] };
  size: number;
  nameY: number;
  show: boolean;
}) {
  const id = service && resolveLogoId(service.name, service.logo);
  if (!service || !id) return null;
  return (
    <>
      <Logo id={id} size={size} />
      {show && <ServiceName x={0} y={nameY}>{service.name}</ServiceName>}
    </>
  );
}

/** Service name above a logo (the Services toggle). */
function ServiceName({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} className="service2d">
      {children}
    </text>
  );
}

/** Regular octagon points (flat faces on the axes), for module outlines. */
function octagon(r: number) {
  return Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
}

function fan(count: number, center: number, span: number) {
  if (count <= 1) return [center];
  return Array.from({ length: count }, (_, i) => center - span / 2 + (i * span) / (count - 1));
}

/**
 * Top-down SVG version of the station for devices without (good) WebGL or with reduced motion.
 * Same layout and interactions as the 3D scene.
 */
export function Station2D({ focus, onSelect, locked, homeserver, showServices = true }: StationProps) {
  useSyncExternalStore(subscribe, getVersion);
  const zoom = getGoal().zoom;
  const root = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => layoutHome(homeserver), [homeserver]);
  // The picture grows with the homeserver: fit shipyard on the left to the last room on the right.
  const right = Math.max(700, HOME_X + layout.reachX * K + 80);
  const VB_W = right - SHIPYARD_LEFT;
  const VB_H = Math.max(560, 2 * (layout.halfZ * K + 120));
  const vbRef = useRef({ w: VB_W, h: VB_H });
  vbRef.current = { w: VB_W, h: VB_H };
  const cx = (SHIPYARD_LEFT + right) / 2;

  // Drag pans, wheel zooms (shared with the slider), double-click resets.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let travelled = 0;
    let pinch = 0;
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const setZoom = (z: number) => {
      getGoal().zoom = Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], z));
      changed();
    };

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        travelled = 0;
        dragState.moved = false;
      } else if (pointers.size === 2) {
        pinch = spread();
        dragState.moved = true;
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const d = spread();
        if (pinch > 0 && d > 0) setZoom(getGoal().zoom * (pinch / d));
        pinch = d;
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      travelled += Math.abs(dx) + Math.abs(dy);
      if (travelled < DRAG_THRESHOLD_PX) return;
      dragState.moved = true;
      // Pixels -> SVG units at the current zoom (meet-fit: the larger ratio wins).
      const w = vbRef.current.w * getGoal().zoom;
      const h = vbRef.current.h * getGoal().zoom;
      const rect = el.getBoundingClientRect();
      const unit = Math.max(w / rect.width, h / rect.height);
      pan2d.x += dx * unit;
      pan2d.y += dy * unit;
      changed();
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = pointers.size === 2 ? spread() : 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(getGoal().zoom * Math.exp(e.deltaY * 0.001));
    };

    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('dblclick', reset);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('dblclick', reset);
    };
  }, []);

  const ship = (id: Focus, label: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    className: `ship2d${focus === id ? ' is-active' : ''}`,
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (!dragState.moved) onSelect(id);
    },
    onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onSelect(id),
  });

  const ghosts = fan(projects.length, Math.PI, Math.min(Math.PI * 1.1, (projects.length - 1) * 0.9));

  return (
    <div ref={root} className="scene scene-2d" onClick={() => !dragState.moved && onSelect('overview')}>
      <div className="stars2d" aria-hidden />
      <svg
        viewBox={`${cx - pan2d.x - (VB_W * zoom) / 2} ${-pan2d.y - (VB_H * zoom) / 2} ${VB_W * zoom} ${VB_H * zoom}`}
        preserveAspectRatio="xMidYMid meet"
        className="station2d"
      >
        {/* long arms + junctions */}
        <rect x="-430" y="-9" width="860" height="18" className="corridor2d" />
        <line x1="-430" y1="0" x2="430" y2="0" className="corridor-windows2d" />
        {locked && <line x1="261" y1="0" x2="420" y2="0" className="corridor-windows2d is-off" />}
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${s * 235} 0)`}>
            <line x1="0" y1="-70" x2="0" y2="70" className="strut2d" />
            <polygon points={octagon(26)} className="module2d" />
            <SharedLogo service={sharedServices[s > 0 ? 2 : 3]} size={26} nameY={-34} show={showServices} />
            <polygon points={octagon(14)} transform="translate(0 -84)" className="solar2d" />
            <polygon points={octagon(14)} transform="translate(0 84)" className="solar2d" />
          </g>
        ))}

        {/* main hub */}
        <g {...ship('main', 'Main ship: portfolio')}>
          <rect x="-9" y="-150" width="18" height="300" className="corridor2d" />
          <polygon points={octagon(70)} className="module2d" />
          <polygon points={octagon(44)} className="dome2d" />
          <circle r="26" className="ring2d" />
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(0 ${s * 165})`}>
              <polygon points={octagon(30)} className="module2d" />
              <SharedLogo service={sharedServices[s > 0 ? 0 : 1]} size={30} nameY={s > 0 ? 50 : -40} show={showServices} />
            </g>
          ))}
          <text x="0" y="-232" className="label2d">MAIN SHIP</text>
          <text x="0" y="-214" className="sublabel2d">Portfolio</text>
        </g>

        {/* shipyard */}
        <g transform="translate(-450 0)" {...ship('projects', 'Shipyard: upcoming projects')}>
          <rect x="-60" y="-60" width="120" height="120" className="scaffold2d" />
          {ghosts.map((a, i) => (
            <g key={i}>
              <line x1="0" y1="0" x2={Math.cos(a) * 105} y2={Math.sin(a) * 105} className="ghost-line2d" />
              <polygon points={octagon(22)} transform={`translate(${Math.cos(a) * 105} ${Math.sin(a) * 105})`} className="ghost2d" />
            </g>
          ))}
          <polygon points={octagon(42)} className="module2d amber" />
          <circle cx="50" cy="-50" r="5" className="blink2d amber" />
          <text x="0" y="-150" className="label2d amber">SHIPYARD</text>
          <text x="0" y="-132" className="sublabel2d">Projects · coming soon</text>
        </g>

        {/* homeserver */}
        <g transform="translate(450 0)" opacity={locked ? 0.7 : 1} {...ship('homeserver', locked ? 'Homeserver: powered down' : 'Homeserver ship')}>
          {layout.spineEnd > 0 && <line x1="0" y1="0" x2={layout.spineEnd * K} y2="0" className="corridor-line2d" />}
          {layout.rooms.map((room) => {
            const rx = room.x * K;
            const ry = room.z * K;
            return (
              <g key={room.key}>
                <line x1={rx} y1="0" x2={rx} y2={ry} className="corridor-line2d" />
                {room.pods.map((pod, j) => {
                  const g = pod.guest;
                  const px = pod.x * K;
                  const py = pod.z * K;
                  const logoId = resolveLogoId(g.name, g.logo);
                  return (
                    <g key={g.vmid}>
                      <line x1={rx} y1={ry} x2={px} y2={py} className="strut2d" />
                      <circle cx={px} cy={py} r={POD_R * K} className={`pod2d ${g.status}`}>
                        <title>
                          {g.name} · {g.status}
                          {locked ? ' · locked' : ''}
                        </title>
                      </circle>
                      {logoId && (
                        <g transform={`translate(${px} ${py})`} pointerEvents="none">
                          <Logo id={logoId} size={POD_R * K * 1.25} dim={g.status !== 'running' || locked} />
                        </g>
                      )}
                      {showServices && (
                        <ServiceName x={px} y={py + (room.side > 0 ? 1 : -1) * (POD_R * K + 9 + (j % 2) * 13) + (room.side > 0 ? 4 : 0)}>
                          {g.name}
                        </ServiceName>
                      )}
                    </g>
                  );
                })}
                <polygon points={octagon(ROOM_R * K)} transform={`translate(${rx} ${ry})`} className="module2d" />
                {room.label && (
                  <text x={rx} y={ry + 4} className="room-label2d">
                    {room.label}
                  </text>
                )}
              </g>
            );
          })}
          <polygon points={octagon(44)} className="module2d" />
          <circle r="26" className={`core2d${locked ? ' is-off' : ''}`} />
          <Logo id="proxmox" size={30} dim={locked} />
          {showServices && <ServiceName x={0} y={-56}>Proxmox</ServiceName>}
          <text x="0" y="-228" className="label2d">HOMESERVER</text>
          <text x="0" y="-210" className="sublabel2d">{locked ? 'Powered down' : 'Clearance granted'}</text>
        </g>
      </svg>
    </div>
  );
}
