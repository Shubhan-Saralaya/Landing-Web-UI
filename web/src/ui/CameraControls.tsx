import { useEffect, useState, useSyncExternalStore } from 'react';
import { ZOOM_RANGE, dragState, getGoal, getVersion, reset, setZoom, subscribe } from '../scene/cameraControl';

const LN_MIN = Math.log(ZOOM_RANGE[0]);
const LN_MAX = Math.log(ZOOM_RANGE[1]);
const HINT_KEY = 'station.cameraHintSeen';

// Slider is 0 (zoomed out) … 100 (zoomed in), linear in log-distance so it feels even.
const toSlider = (zoom: number) => ((LN_MAX - Math.log(zoom)) / (LN_MAX - LN_MIN)) * 100;
const fromSlider = (v: number) => Math.exp(LN_MAX - (v / 100) * (LN_MAX - LN_MIN));

function hintSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Reset button, zoom slider and a "click and drag" hint for the 3D camera. */
export function CameraControls({
  showServices,
  onToggleServices,
  flat = false,
}: {
  showServices: boolean;
  onToggleServices: () => void;
  /** 2D view: dragging pans instead of orbiting. */
  flat?: boolean;
}) {
  useSyncExternalStore(subscribe, getVersion);
  const zoom = getGoal().zoom;
  const [showHint, setShowHint] = useState(() => !hintSeen());

  // Fade the hint once the visitor has actually dragged the view.
  useEffect(() => {
    if (!showHint) return;
    const done = () => {
      if (!dragState.moved) return;
      setShowHint(false);
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        /* private mode: the hint just shows again next visit */
      }
    };
    window.addEventListener('pointerup', done);
    return () => window.removeEventListener('pointerup', done);
  }, [showHint]);

  return (
    <div className="cam-controls" role="group" aria-label="Camera controls">
      <p className={`cam-hint mono${showHint ? '' : ' is-quiet'}`}>
        <span className="cam-hint-touch">Drag to {flat ? 'pan' : 'look around'} · pinch to zoom</span>
        <span className="cam-hint-mouse">Click &amp; drag to {flat ? 'pan' : 'look around'} · scroll to zoom</span>
      </p>
      <div className="cam-row">
        <button
          className={`hud-chip${showServices ? ' is-on' : ''}`}
          onClick={onToggleServices}
          aria-pressed={showServices}
          title="Show or hide service names above their logos"
        >
          Services
        </button>
        <button className="hud-chip" onClick={reset} title="Reset camera (or double-click the scene)">
          Reset view
        </button>
        <label className="cam-zoom">
          <span className="mono">Zoom</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={toSlider(zoom)}
            onChange={(e) => setZoom(fromSlider(Number(e.target.value)))}
            aria-label="Zoom"
          />
        </label>
      </div>
    </div>
  );
}
