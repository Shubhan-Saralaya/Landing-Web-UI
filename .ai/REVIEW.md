# REVIEW

Audit 2026-10-11. Format: file:line | issue | fix. No code changed.
Baseline: `tsc -b` clean; `cargo clippy` 1 warning; `npm audit` 2 (1 high, 1 moderate, dev-only).

## CRIT
none

## HIGH
- server/src/auth.rs:32 | session_email() only checks decrypt+exp, never re-checks ALLOWED_EMAILS; removing an email leaves its session valid for up to 7d (only fix is rotating SESSION_SECRET, which logs everyone out) | in session_email (or in main.rs:78 homeserver) also require state.config.is_allowed(&email); consider shorter SESSION_DAYS
- web/package.json:25 | vite 5.4.21 + esbuild <=0.24.2 have advisories (path traversal in optimized-deps .map; any site can read dev server responses), dev-only but hits `npm run dev` | upgrade vite (major, currently 8.x) + @vitejs/plugin-react; until then don't expose dev server (no --host)

## MED
- server/src/main.rs:110 | strip_urls is a denylist on key "url"; any future link field (href, console, ip, etc.) added to homeserver.json is served publicly | build the public view from an explicit allowlist struct (datacenter, node id/name, guest vmid/name/kind/status/description) via serde, not by stripping
- server/src/main.rs:47 | reqwest client has no timeout; a stalled Google token/userinfo call hangs /auth/callback indefinitely | .timeout(Duration::from_secs(10)).connect_timeout(..)
- server/src/main.rs:55 | no security headers (CSP, X-Frame-Options/frame-ancestors, Referrer-Policy, X-Content-Type-Options, HSTS) | add tower-http SetResponseHeaderLayer (or set in Cloudflare); CSP must allow fonts.googleapis/gstatic
- web/src/data/portfolio.ts:8 | resumeUrl='/resume.pdf' but web/public/resume.pdf absent; SPA fallback (main.rs:53) serves index.html as 200 so "Download resume" saves HTML named resume.pdf | add the file or set resumeUrl ''
- server/src/main.rs:53 | SPA fallback answers every unknown path with index.html 200, incl /api/* typos and missing assets, masking errors | route /api/* and /auth/* fallbacks to 404 (nest a Router with .fallback(404)) and only SPA-fallback for non-file paths
- server/data/homeserver.json:7,21 | Tailscale tailnet hostnames (home*.tail4d2523.ts.net) + internal topology committed to git; not credentials, but leak if repo ever goes public | keep repo private or move file out of git (e.g. /opt/station/data, HOMESERVER_DATA env) and commit an example
- deploy/deploy.sh:7 | vite build empties web/dist in place while the live server is serving it; visitors get broken/blank pages during deploy; no rollback | build to temp outDir then atomic mv/symlink swap; keep previous build
- web/src/data/portfolio.ts:19-59, web/src/data/projects.ts:13-31 | placeholder content ("Company Name", "@your-handle") shipped to prod | fill real content before launch
- (repo) | no tests at all; security boundary (strip_urls, auth gate, allowlist) is untested | add Rust tests: strip_urls/public view never contains links, /api/homeserver 401 w/o cookie, is_allowed case-folding, Config::from_env validation
- web/package.json:13-25, server/Cargo.toml:8-19 | majors behind: react 18->19, fiber 8->9, drei 9->10, three 0.169->0.186, TS 5.6->7, vite 5->8 (npm outdated); Rust pins axum 0.7, axum-extra 0.9, tower-http 0.5, rand 0.8 while lockfile already pulls tower-http 0.6 + rand 0.10 transitively (duplicate builds) | upgrade in batches (react19+fiber9+drei10 together; axum 0.8+ changes path syntax); check `cargo outdated` for current Rust majors

## LOW
- server/src/config.rs:72 | clippy manual_contains | self.allowed_emails.contains(&email)
- server/src/auth.rs:64 | single oauth_state cookie; two concurrent login tabs overwrite each other -> second callback "error" | accept; or key state cookie by nonce
- server/src/auth.rs:56 | no PKCE (confidential client so acceptable) | add code_challenge S256 for defence in depth
- server/src/main.rs:72 | no graceful shutdown; systemd restart drops in-flight requests | axum::serve(..).with_graceful_shutdown(ctrl_c/SIGTERM)
- server/src/main.rs:53 | hashed /assets/* served without long Cache-Control; no compression (three chunk ~1MB) | SetResponseHeader immutable for /assets; CompressionLayer (or rely on Cloudflare)
- README.md:44-46 | rustup installed as root but service/deploy user unclear; .env copied without chmod 600 | document `chmod 600 /opt/station/.env`, install toolchain for deploy user
- deploy/deploy.sh:9 | uses sudo; fails if run as root without sudo installed | `${SUDO:-sudo}` or check EUID
- web/src/hooks/useRenderMode.ts:11 | probe WebGL context never released (counts toward browser context limit) | ctx.getExtension('WEBGL_lose_context')?.loseContext()
- web/src/hooks/useAuth.ts:27 | useState initializer mutates history (impure; StrictMode double-invokes) | read notice in useEffect once
- web/src/scene/HomeShip.tsx:159-163 | sets document.body.style.cursor manually while Selectable uses useCursor; pointerOut resets to auto while still over ship | use drei useCursor with local hovered/openable state
- web/src/scene/HomeShip.tsx:36, web/src/scene/Environment.tsx:78 | coreMat + glow CanvasTextures created in useMemo never disposed; leak on each 3D<->2D toggle | useEffect cleanup -> dispose()
- web/src/fallback/Station2D.tsx:13 | fan() duplicates layout.ts fanAngles (layout.ts imports no three, safe to reuse) | import fanAngles from ../scene/layout
- web/src/fallback/Station2D.tsx:32 | Space on role=button scrolls page (no preventDefault) and doesn't stop propagation | e.preventDefault() for ' '
- web/src/App.tsx:66 | stationProps rebuilt every render -> whole 3D Scene re-renders on any App state change | useMemo; React.memo Scene children
- web/src/ui/MainPanel.tsx:18 | role=tablist without arrow-key nav / aria-controls / tabpanel | add roving tabindex + tabpanel ids
- web/src/ui/Panel.tsx:21 | panel open doesn't move focus; no focus return on close | focus panel heading on open, restore on close
- web/index.html:11 | Google Fonts third-party request (privacy, render-blocking) | self-host woff2 in web/public
- web/src/scene/CameraRig.tsx:10-12 | constants duplicated with styles.css:16-17 and media queries; easy drift | read CSS vars at runtime (getComputedStyle) or single TS source injected as CSS vars
- (repo) | no eslint/prettier, no CI | add eslint (react-hooks plugin would catch Strut deps parts.tsx:165), GH Action: typecheck+build+clippy+test

## TOP 5
1. auth.rs:32 re-check allowlist on every session read (revocation)
2. main.rs:110 replace strip_urls denylist with allowlist public DTO + tests for it
3. main.rs:47 add HTTP client timeouts
4. main.rs:55 security headers + /api 404 fallback
5. upgrade vite (dev-server advisories), then plan react19/fiber9 + axum0.8 upgrades
