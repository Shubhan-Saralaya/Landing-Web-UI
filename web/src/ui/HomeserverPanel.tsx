import { useState, type FormEvent } from 'react';
import type { Auth } from '../hooks/useAuth';
import type { Guest } from '../types';
import { LockIcon } from './HUD';

export function HomeserverPanel({ auth }: { auth: Auth }) {
  if (auth.status === 'loading') {
    return <p className="muted mono">Scanning credentials…</p>;
  }

  const locked = auth.status === 'locked';
  const { data } = auth;

  return (
    <>
      {locked ? (
        <div className={`airlock${data ? ' is-compact' : ''}`}>
          <div className="airlock-door" aria-hidden>
            <LockIcon />
          </div>
          <div className="airlock-text">
            <p className="airlock-code mono">RESTRICTED SECTOR · CLEARANCE REQUIRED</p>
            <p className="muted">
              You can see what's running aboard. Opening a system requires crew clearance.
            </p>
          </div>
          {auth.notice === 'denied' && <p className="alert">That account isn't on the clearance list.</p>}
          {auth.mode === 'password' ? (
            <TestLoginForm onSubmit={auth.loginWithPassword} />
          ) : (
            <button className="btn btn-danger" onClick={auth.login}>
              Request clearance with Google
            </button>
          )}
        </div>
      ) : (
        <div className="clearance">
          <span className="mono accent">Clearance granted</span>
          <span className="muted mono">{auth.email}</span>
          <button className="btn btn-small btn-ghost" onClick={auth.logout}>
            Seal airlock
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="core">
            <span className="core-dot" />
            <div>
              <h2>Proxmox core</h2>
              <p className="muted mono">
                Datacenter {data.datacenter} · {countRunning(data.nodes.flatMap((n) => n.guests))}/
                {data.nodes.reduce((n, node) => n + node.guests.length, 0)} systems online
              </p>
            </div>
          </div>

          <div className="rooms">
            {data.nodes.map((node) => (
              <section key={node.id} className="room">
                <div className="room-head">
                  <h3>{node.name}</h3>
                  {node.url && (
                    <a className="mono small" href={node.url} target="_blank" rel="noreferrer" title="Proxmox UI (Tailscale only)">
                      console ↗
                    </a>
                  )}
                </div>
                <ul className="guests">
                  {node.guests.map((g) => (
                    <li key={g.vmid}>
                      <GuestRow guest={g} locked={locked} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** TEST ONLY: shown while the server runs with TEST_LOGIN_USER/PASSWORD instead of Google. */
function TestLoginForm({ onSubmit }: { onSubmit: (u: string, p: string) => Promise<boolean> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailed(!(await onSubmit(username, password)));
  };

  return (
    <form onSubmit={submit} className="test-login">
      <input placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {failed && <p className="alert">Wrong username or password.</p>}
      <button className="btn btn-danger" type="submit">
        Request clearance (test login)
      </button>
    </form>
  );
}

function countRunning(guests: Guest[]) {
  return guests.filter((g) => g.status === 'running').length;
}

function GuestRow({ guest: g, locked }: { guest: Guest; locked: boolean }) {
  const body = (
    <>
      <span className={`pod pod-${g.status}`} aria-label={g.status} />
      <span className="guest-name">{g.name}</span>
      <span className="mono muted small">
        {g.vmid} · {g.kind.toUpperCase()}
      </span>
      {g.description && <span className="guest-desc muted">{g.description}</span>}
    </>
  );

  if (g.url) {
    return (
      <a className="guest is-link" href={g.url} target="_blank" rel="noreferrer">
        {body}
        <span className="guest-go">↗</span>
      </a>
    );
  }
  return (
    <div className={`guest${locked ? ' is-locked' : ''}`} title={locked ? 'Clearance required to open' : undefined}>
      {body}
      {locked && (
        <span className="guest-go">
          <LockIcon />
        </span>
      )}
    </div>
  );
}
