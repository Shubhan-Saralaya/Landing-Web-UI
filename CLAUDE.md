# CLAUDE.md

Portfolio + homeserver hub (shubhanx86.com) as a 3D space station. `web/` = React/Vite/r3f, `server/` = Rust axum (static + Google OAuth + gated homeserver map).

Details (commands, env, routes, funcs, flows, gotchas): **`.ai/CODEBASE.md`**. Open issues: `.ai/REVIEW.md`.

## Rules
- Read `.ai/CODEBASE.md` before working.
- After any change, update the affected `CODEBASE.md` sections and add a `CHANGELOG.md` entry.
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Never commit secrets (`.env` stays local; add new var names to `.env.example`).
- Security boundary is server-side: homeserver links only ever leave the server via authenticated `/api/homeserver`. Never put them in the JS bundle.
