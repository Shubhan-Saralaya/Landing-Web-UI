import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { FOCI, type Focus } from './types';
import { useAuth } from './hooks/useAuth';
import { useRenderMode } from './hooks/useRenderMode';
import { Station2D } from './fallback/Station2D';
import { HUD } from './ui/HUD';
import { CameraControls } from './ui/CameraControls';
import { Panel } from './ui/Panel';
import { MainPanel } from './ui/MainPanel';
import { ProjectsPanel } from './ui/ProjectsPanel';
import { HomeserverPanel } from './ui/HomeserverPanel';
import { Toast } from './ui/Toast';

// three.js + fiber are only downloaded when the 3D view is actually used.
const Station3D = lazy(() => import('./scene/Station3D'));

const SERVICES_KEY = 'station.showServices';

/** On unless the visitor switched it off. */
function readShowServices(): boolean {
  try {
    return localStorage.getItem(SERVICES_KEY) !== '0';
  } catch {
    return true;
  }
}

function focusFromHash(): Focus {
  const h = window.location.hash.replace('#', '') as Focus;
  return FOCI.includes(h) ? h : 'overview';
}

/** If WebGL dies at runtime (lost context, driver issue), drop to the 2D view instead of a blank page. */
class SceneBoundary extends Component<
  { fallback: ReactNode; onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('3D scene crashed, showing 2D view:', error);
    this.props.onError(error.message || String(error));
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function BootScreen() {
  return (
    <div className="boot" role="status">
      <div className="boot-ring" />
      <p>Docking sequence…</p>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const [mode, setMode] = useRenderMode();
  const [focus, setFocusState] = useState<Focus>(focusFromHash);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [showServices, setShowServices] = useState(readShowServices);
  const toggleServices = useCallback(() => {
    setShowServices((on) => {
      try {
        localStorage.setItem(SERVICES_KEY, on ? '0' : '1');
      } catch {
        /* storage unavailable: choice lasts for this visit */
      }
      return !on;
    });
  }, []);

  const setFocus = useCallback((next: Focus) => {
    setFocusState(next);
    const hash = next === 'overview' ? '' : `#${next}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', window.location.pathname + window.location.search + hash);
    }
  }, []);

  useEffect(() => {
    const onPop = () => setFocusState(focusFromHash());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus('overview');
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, [setFocus]);

  const locked = auth.status !== 'unlocked';
  const stationProps = { focus, onSelect: setFocus, locked, homeserver: auth.data, showServices };
  const flat = <Station2D {...stationProps} />;

  return (
    <div className="app">
      {mode === '3d' ? (
        <SceneBoundary fallback={flat} onError={setSceneError}>
          <Suspense fallback={<BootScreen />}>
            <Station3D {...stationProps} />
          </Suspense>
        </SceneBoundary>
      ) : (
        flat
      )}

      <CameraControls showServices={showServices} onToggleServices={toggleServices} flat={mode === '2d' || !!sceneError} />
      {sceneError && (
        <div className="scene-error mono" role="alert">
          <span>3D view crashed: {sceneError}</span>
          <button
            className="hud-chip"
            onClick={() => {
              setSceneError(null);
              setMode('2d');
              setTimeout(() => setMode('3d'), 0);
            }}
          >
            Retry 3D
          </button>
        </div>
      )}
      <HUD focus={focus} onNavigate={setFocus} mode={mode} onModeChange={setMode} locked={locked} />

      <Panel focus={focus} onClose={() => setFocus('overview')}>
        {focus === 'main' && <MainPanel />}
        {focus === 'projects' && <ProjectsPanel />}
        {focus === 'homeserver' && <HomeserverPanel auth={auth} />}
      </Panel>

      {auth.notice && <Toast notice={auth.notice} onDismiss={auth.dismissNotice} />}
    </div>
  );
}
