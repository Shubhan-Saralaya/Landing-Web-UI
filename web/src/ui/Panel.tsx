import { useEffect, useRef, type ReactNode } from 'react';
import type { Focus } from '../types';

const META: Record<Exclude<Focus, 'overview'>, { code: string; title: string }> = {
  main: { code: 'S-01 · Main ship', title: 'Portfolio' },
  projects: { code: 'S-02 · Shipyard', title: 'Open projects' },
  homeserver: { code: 'S-03 · Homeserver', title: 'Homeserver ship' },
};

/** Side panel on desktop, bottom sheet on mobile. Stays mounted so it can animate in and out. */
export function Panel({ focus, onClose, children }: { focus: Focus; onClose: () => void; children: ReactNode }) {
  const open = focus !== 'overview';
  const body = useRef<HTMLDivElement>(null);
  const meta = open ? META[focus] : null;

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [focus]);

  return (
    <aside className={`panel${open ? ' is-open' : ''}`} aria-hidden={!open} aria-label={meta?.title}>
      {meta && (
        <>
          <div className="panel-head">
            <div>
              <p className="panel-code">{meta.code}</p>
              <h1 className="panel-title">{meta.title}</h1>
            </div>
            <button className="panel-close" onClick={onClose} aria-label="Close panel">
              ✕
            </button>
          </div>
          <div className="panel-body" ref={body}>
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
