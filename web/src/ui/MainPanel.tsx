import { useState } from 'react';
import { contacts, experience, profile, skills } from '../data/portfolio';
import { sharedServices } from '../data/shared';

const TABS = ['Experience', 'Skills', 'Contact', 'Shared systems'] as const;
type Tab = (typeof TABS)[number];

export function MainPanel() {
  const [tab, setTab] = useState<Tab>('Experience');

  return (
    <>
      <div className="intro">
        <h2>{profile.title}</h2>
        <p>{profile.tagline}</p>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Experience' && (
        <section>
          <ol className="timeline">
            {experience.map((e) => (
              <li key={`${e.org}-${e.role}`}>
                <div className="timeline-head">
                  <h3>{e.role}</h3>
                  <span className="mono muted">{e.period}</span>
                </div>
                <p className="muted">
                  {e.org}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                <ul>
                  {e.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {profile.resumeUrl && (
            <a className="btn" href={profile.resumeUrl} download>
              Download resume
            </a>
          )}
        </section>
      )}

      {tab === 'Skills' && (
        <section className="skill-grid">
          {skills.map((g) => (
            <div key={g.group} className="module">
              <h3 className="module-title">{g.group}</h3>
              <div className="chips">
                {g.items.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'Contact' && (
        <section className="contact-list">
          {contacts.map((c) => (
            <a key={c.label} className="contact" href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              <span className="contact-label">{c.label}</span>
              <span className="mono">{c.handle}</span>
            </a>
          ))}
        </section>
      )}

      {tab === 'Shared systems' && (
        <section>
          <p className="muted">Infrastructure every ship in the station relies on.</p>
          <div className="skill-grid">
            {sharedServices.map((s) => (
              <div key={s.name} className="module">
                <h3 className="module-title">{s.name}</h3>
                <p className="mono accent">{s.role}</p>
                <p className="muted">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
