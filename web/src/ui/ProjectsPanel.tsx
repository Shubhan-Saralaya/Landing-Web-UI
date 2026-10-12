import { projects, type Project } from '../data/projects';

const STATUS: Record<Project['status'], string> = {
  'in-construction': 'In construction',
  planned: 'Planned',
  launched: 'Launched',
};

export function ProjectsPanel() {
  return (
    <>
      <p className="muted">
        Projects being built in the shipyard. Each one will launch on the homeserver when it's ready.
      </p>
      <div className="project-list">
        {projects.map((p) => (
          <article key={p.name} className={`module project status-${p.status}`}>
            <div className="project-head">
              <h3 className="module-title">{p.name}</h3>
              <span className="status-pill">{STATUS[p.status]}</span>
            </div>
            <p className="muted">{p.blurb}</p>
            <div className="chips">
              {p.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
            {(p.url || p.repo) && (
              <div className="project-links">
                {p.url && (
                  <a className="btn btn-small" href={p.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                )}
                {p.repo && (
                  <a className="btn btn-small btn-ghost" href={p.repo} target="_blank" rel="noreferrer">
                    Source
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
