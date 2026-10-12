import type { Focus } from '../types';
import type { RenderMode } from '../hooks/useRenderMode';
import { profile } from '../data/portfolio';

interface Props {
  focus: Focus;
  onNavigate: (f: Focus) => void;
  mode: RenderMode;
  onModeChange: (m: RenderMode) => void;
  locked: boolean;
}

export function HUD({ focus, onNavigate, mode, onModeChange, locked }: Props) {
  const nav: { id: Focus; label: string; code: string }[] = [
    { id: 'main', label: 'Main ship', code: 'S-01' },
    { id: 'projects', label: 'Shipyard', code: 'S-02' },
    { id: 'homeserver', label: 'Homeserver', code: 'S-03' },
  ];

  return (
    <>
      <header className="hud-top">
        <button className="brand" onClick={() => onNavigate('overview')} aria-label="Back to station overview">
          <span className="brand-name">{profile.name}</span>
          <span className="brand-sub">// station</span>
        </button>
        <button
          className="hud-chip"
          onClick={() => onModeChange(mode === '3d' ? '2d' : '3d')}
          title="Switch between the 3D station and a lighter 2D view"
        >
          {mode === '3d' ? '2D view' : '3D view'}
        </button>
      </header>

      <nav className="hud-nav" aria-label="Station sectors">
        {nav.map((n) => (
          <button
            key={n.id}
            className={`hud-nav-btn${focus === n.id ? ' is-active' : ''}${n.id === 'homeserver' && locked ? ' is-locked' : ''}`}
            onClick={() => onNavigate(focus === n.id ? 'overview' : n.id)}
            aria-pressed={focus === n.id}
          >
            <span className="hud-nav-code">{n.code}</span>
            <span className="hud-nav-label">
              {n.label}
              {n.id === 'homeserver' && locked && <LockIcon />}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}

export function LockIcon() {
  return (
    <svg className="lock-icon" viewBox="0 0 16 16" aria-label="locked" role="img">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
