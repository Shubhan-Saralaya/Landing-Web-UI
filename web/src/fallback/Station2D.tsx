import type { KeyboardEvent } from 'react';
import type { Focus, StationProps } from '../types';
import { projects } from '../data/projects';

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
export function Station2D({ focus, onSelect, locked, homeserver }: StationProps) {
  const ship = (id: Focus, label: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    className: `ship2d${focus === id ? ' is-active' : ''}`,
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(id);
    },
    onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onSelect(id),
  });

  const nodes = homeserver?.nodes ?? [];
  const rooms = fan(Math.max(nodes.length, 2), 0, Math.PI / 2);
  const ghosts = fan(projects.length, Math.PI, Math.min(Math.PI * 1.1, (projects.length - 1) * 0.9));

  return (
    <div className="scene scene-2d" onClick={() => onSelect('overview')}>
      <div className="stars2d" aria-hidden />
      <svg viewBox="-640 -260 1280 520" preserveAspectRatio="xMidYMid meet" className="station2d">
        {/* long arms + junctions */}
        <rect x="-430" y="-9" width="860" height="18" className="corridor2d" />
        <line x1="-430" y1="0" x2="430" y2="0" className="corridor-windows2d" />
        {locked && <rect x="330" y="-13" width="12" height="26" className="airlock2d" />}
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${s * 235} 0)`}>
            <line x1="0" y1="-70" x2="0" y2="70" className="strut2d" />
            <polygon points={octagon(26)} className="module2d" />
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
              <circle r="11" className="ring2d" />
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
        <g transform="translate(450 0)" {...ship('homeserver', locked ? 'Homeserver: restricted' : 'Homeserver ship')}>
          {rooms.map((a, i) => {
            const node = nodes[i];
            const rx = Math.cos(a) * 125;
            const ry = Math.sin(a) * 125;
            const guests = node?.guests ?? [];
            const pods = fan(guests.length, a, Math.min((guests.length - 1) * 0.55, Math.PI * 1.5));
            return (
              <g key={node?.id ?? i}>
                <line x1="0" y1="0" x2={rx} y2={ry} className="corridor-line2d" />
                {guests.map((g, j) => {
                  const px = rx + Math.cos(pods[j]) * 60;
                  const py = ry + Math.sin(pods[j]) * 60;
                  return (
                    <g key={g.vmid}>
                      <line x1={rx} y1={ry} x2={px} y2={py} className="strut2d" />
                      <circle cx={px} cy={py} r="10" className={`pod2d ${g.status}`}>
                        <title>
                          {g.name} · {g.status}
                          {locked ? ' · locked' : ''}
                        </title>
                      </circle>
                    </g>
                  );
                })}
                <polygon points={octagon(30)} transform={`translate(${rx} ${ry})`} className="module2d" />
                {node && (
                  <text x={rx} y={ry + 4} className="room-label2d">
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
          <polygon points={octagon(44)} className="module2d" />
          <circle r="26" className="core2d" />
          {locked && <ellipse cx="80" cy="0" rx="200" ry="175" className="shield2d" />}
          <text x="0" y="-200" className={`label2d${locked ? ' red' : ''}`}>HOMESERVER</text>
          <text x="0" y="-182" className="sublabel2d">{locked ? 'Restricted sector' : 'Clearance granted'}</text>
        </g>
      </svg>
    </div>
  );
}
