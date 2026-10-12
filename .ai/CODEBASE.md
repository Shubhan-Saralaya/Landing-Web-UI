# CODEBASE

## META
name: shubhan-station (web: station-web, server: station-server)
purpose: portfolio + homeserver hub @ shubhanx86.com, rendered as interactive 3D space station
stack.web: React 18.3, Vite 5.4, TS 5.6, three 0.169, @react-three/fiber 8.18, drei 9.122
stack.server: Rust 2021 (rustc 1.99 local), axum 0.7, axum-extra 0.9 (cookie-private), tokio 1, reqwest 0.12 rustls, tower-http 0.5
entry.web: web/index.html -> web/src/main.tsx -> App.tsx
entry.server: server/src/main.rs:35 main()
host: Proxmox LXC 112 home2-web, systemd unit `station`, Cloudflare tunnel -> :8080

## RUN
install: cd web && npm install
dev.web: cd web && npm run dev   # :5173, proxies /api,/auth -> :8080 (web/vite.config.ts:10)
dev.server: cd server && cargo run   # :8080; .env needs PUBLIC_URL=http://localhost:5173
build.web: cd web && npm run build   # tsc -b && vite build -> web/dist
build.server: cd server && cargo build --release
typecheck: cd web && npm run typecheck
lint: cd server && cargo clippy   # no eslint configured
test: none
deploy: on LXC: /opt/station/deploy/deploy.sh   # git pull, npm ci+build, cargo build --release, systemctl restart station
first-time deploy: README.md "Deploy" section
launch cfg: .claude/launch.json (web dev only)

## ENV
file: repo-root .env (dotenvy searches parents, main.rs:37; prod: systemd EnvironmentFile)
GOOGLE_CLIENT_ID: config.rs:49 -> auth.rs:57,129
GOOGLE_CLIENT_SECRET: config.rs:50 -> auth.rs:130
PUBLIC_URL: config.rs:51 -> redirect_uri (config.rs:62), Secure cookie flag if https (config.rs:66)
ALLOWED_EMAILS: config.rs:39, comma list, lowercased -> is_allowed (config.rs:70)
SESSION_SECRET: config.rs:34, >=32 chars -> SHA-512 -> cookie Key (config.rs:76)
TEST_LOGIN_USER / TEST_LOGIN_PASSWORD: opt, TEST ONLY; both set => Google OAuth off, GOOGLE_* not required, POST /auth/test-login enabled (auth.rs test_login)
BIND_ADDR: opt, default 0.0.0.0:8080
STATIC_DIR: opt, default ../web/dist (relative to cwd = server/)
HOMESERVER_DATA: opt, default data/homeserver.json
RUST_LOG: opt, tracing EnvFilter, default "info,tower_http=info"

## STRUCTURE
.ai/            AI guide + review
deploy/         deploy.sh, station.service (systemd)
server/
  src/          main.rs (router, homeserver endpoints), auth.rs (OAuth+session), config.rs (env)
  data/         homeserver.json: private node/guest map, re-read per request
web/
  public/       static assets (favicon; resume.pdf expected, missing)
  src/
    data/       portfolio.ts, projects.ts, shared.ts: public content
    hooks/      useAuth (session+map fetch), useRenderMode (3d/2d pick)
    scene/      3D renderer (lazy chunk): ships, parts, camera, env, materials, layout
    fallback/   Station2D.tsx: SVG renderer
    ui/         HTML overlay: HUD, Panel, *Panel content, Toast
    styles.css  all CSS; --panel-w/--sheet-h coupled to CameraRig

## ROUTES
POST /auth/test-login        -> auth.rs test_login     auth:n  {username,password} JSON, 204 + session | 401; 404 unless TEST_LOGIN_* set
GET  /auth/login             -> auth.rs:52 login       auth:n  sets oauth_state cookie, 302 Google
GET  /auth/callback          -> auth.rs:74 callback    auth:n  (state cookie CSRF) sets session, 302 /?auth=ok|denied|error|cancelled#homeserver
POST /auth/logout            -> auth.rs:156 logout     auth:n  removes session, 204
GET  /api/me                 -> auth.rs:166 me         auth:n  {authenticated,email,mode:google|password}
GET  /api/homeserver         -> main.rs:77 homeserver  auth:y  full map, 401 w/o session, no-store
GET  /api/homeserver/public  -> main.rs:88 homeserver_public auth:n  map w/ all `url` keys stripped
*    fallback                -> main.rs:53 ServeDir(STATIC_DIR) + index.html 200 fallback (SPA)
router: main.rs:55-64

## FUNCS
server:
session_email(&PrivateCookieJar)->Option<String> auth.rs:32  decrypt session cookie, check exp (no allowlist recheck)
cookie(state,name,value,max_age) auth.rs:38  HttpOnly, Lax, Secure if https, path /
login(..) auth.rs:52  csrf=hex(32 rand bytes), scope "openid email", prompt=select_account
callback(..) auth.rs:74  state check -> fetch_verified_email -> allowlist -> 7d session
fetch_verified_email(state,code)->Result<String> auth.rs:122  code->token, GET userinfo, require email_verified, lowercase
Config::from_env()->Result<Config> config.rs:33  validates required vars
Config::cookie_key()->Key config.rs:76
read_map(&AppState)->Option<Value> main.rs:99  fs read+parse per req
strip_urls(&mut Value) main.rs:110  recursive remove key "url" (denylist)
no_store(Value)->Response main.rs:121
web:
App() App.tsx:41  focus state <-> URL hash, Esc/popstate, picks 3D/2D, renders HUD/Panel/Toast
SceneBoundary App.tsx:22  error boundary -> Station2D
useAuth() hooks/useAuth.ts:26  reads ?auth=, /api/me -> /api/homeserver | /api/homeserver/public; login/logout
takeNoticeFromUrl() hooks/useAuth.ts:16  strips ?auth= via replaceState
useRenderMode() hooks/useRenderMode.ts:29  localStorage station.renderMode ?? supports3D()
supports3D() hooks/useRenderMode.ts:7  reduced-motion, webgl, cores>2, mem>2
Station3D (default) scene/Station3D.tsx:109  Canvas; onPointerMissed -> overview
Scene scene/Station3D.tsx:34  yaw=-pi/2 if aspect<0.8; places ships, corridors, env
CameraRig({focus,yaw}) scene/CameraRig.tsx  per-frame lerp, offsets for panel/sheet; manual orbit(az/polar)+zoom via drag/wheel/pinch, dblclick|focus change resets; state in scene/cameraControl.ts (getGoal/reset/setZoom/dragState; click handlers must check dragState.moved); ui/CameraControls.tsx = reset+slider+hint
Selectable scene/Selectable.tsx:19  hover scale, click select, overview label
HomeShip({locked,data,focused}) scene/HomeShip.tsx:35  core, node rooms, guest pods; locked = powered down (homeLights eased by setHomePower)
Pod scene/HomeShip.tsx:140  window.open(url) if focused && url
MainShip scene/MainShip.tsx:14; ProjectShip({count}) scene/ProjectShip.tsx:13
Module/Corridor/Strut/HexArray scene/parts.tsx:24/81/155/184  procedural parts
Asteroids/Nebula/Planet/Shuttle scene/Environment.tsx:18/77/103/121
mats, glowMat(color) scene/materials.ts:13/32  shared/cached materials
LOGOS, logoIdFor(name) scene/logos.ts  roof logo glyphs (simple-icons paths), matched by service name substring; add an entry for new services
RoofLogo scene/RoofLogo.tsx  spherical cap hugging a dome with planar UVs; used via Module `logo` prop
SHIPS, OVERVIEW, JUNCTION_X, faceDist, fanAngles, polar scene/layout.ts:8-32
Station2D(StationProps) fallback/Station2D.tsx:22  SVG mirror of 3D layout
Panel ui/Panel.tsx:11  side panel / bottom sheet
HomeserverPanel({auth}) ui/HomeserverPanel.tsx:5  airlock/login or clearance+logout; guest list, links only if url present

## DATA
HomeserverData (web/src/types.ts:25, server/data/homeserver.json): {datacenter:str, nodes:PveNode[]}
PveNode: {id,name,url?(Proxmox UI, Tailscale),guests:Guest[]}
Guest: {vmid:num(key),name,kind:lxc|vm,status:running|stopped,url?,description?}
Session cookie (auth.rs:26): {email,exp:unix} JSON, encrypted PrivateCookieJar, 7d
oauth_state cookie: hex csrf, 10min
Focus (types.ts:1): overview|main|projects|homeserver
StationProps (types.ts:31): {focus,onSelect,locked,homeserver?} contract for Station3D+Station2D
Project (data/projects.ts:3): {name,status:in-construction|planned|launched,blurb,tags,url?,repo?}
Experience/SkillGroup/Contact (data/portfolio.ts); SharedService (data/shared.ts)
no DB; server/data/homeserver.json is source of truth (manual edits)

## DEPS
Google OAuth2/OIDC: accounts.google.com auth, oauth2.googleapis.com/token, openidconnect.googleapis.com/v1/userinfo
Cloudflare tunnel: public ingress -> LXC :8080 (TLS at edge)
Tailscale: node.url Proxmox consoles only reachable on tailnet
Google Fonts: index.html:11 (Space Grotesk, JetBrains Mono)
axum-extra cookie-private: encrypted session cookie, no server store
reqwest rustls: outbound Google calls, no openssl
tower-http fs/trace: SPA static serving, request logs
drei: Html labels, Stars, AdaptiveDpr, useCursor

## FLOW
page load: index.html -> main.tsx -> App -> useRenderMode -> Station3D(lazy)|Station2D
auth state: useAuth -> GET /api/me -> authed? GET /api/homeserver : GET /api/homeserver/public -> auth.data -> StationProps.homeserver + HomeserverPanel
login: btn -> /auth/login -> set oauth_state -> Google -> /auth/callback -> state==cookie -> token -> userinfo -> verified+allowlisted -> set session -> /?auth=ok#homeserver -> useAuth strips ?auth -> Toast
logout: POST /auth/logout -> remove session -> useAuth.refresh -> locked
navigation: click ship|HUD|hash -> setFocus -> pushState #focus -> CameraRig flies + Panel opens; Esc|empty click|popstate -> overview
open guest: focused HomeShip pod click | HomeserverPanel link -> url present only if server sent full map
content edit: web/src/data/*.ts -> rebuild; server/data/homeserver.json -> live next request

## ADD A SERVICE
edit server/data/homeserver.json: add a guest under its node {vmid,name,kind,status,url?,description?,logo?}; live on next request.
logo: built-in id (scene/logos.ts LOGOS) | {path:"<24x24 svg path d>",color?} | omitted -> matched from name | no match -> no logo.
layout: scene/homeLayout.ts. >6 guests/node -> split into <=3 rooms (names "node · i/n"); >18 hidden. Override via json "layout":{maxPerRoom,maxSubRooms}.
rooms alternate +z/-z along a spine from the core, columns 7.6 apart; reach grows with rooms, homeBounds (cameraControl.ts) feeds CameraRig.
2D view uses the same layout x28 with a viewBox that grows to fit (Station2D.tsx).
verify: cd web && npm run check:layout
shared (hub) services: web/src/data/shared.ts, max 4 logos (arms fore/aft, junctions +x/-x).

## GOTCHAS
security boundary is server-side only: lock icons/power-down are cosmetic; url presence = access (main.rs:88-96)
strip_urls is denylist on key "url"; any new link field (href, console...) would leak publicly (main.rs:110)
session_email doesn't recheck ALLOWED_EMAILS; removing an email doesn't revoke live sessions; rotate SESSION_SECRET (auth.rs:32)
CameraRig PANEL_MAX_PX=460 / SHEET_FRACTION=0.58 / MOBILE_BREAKPOINT=768 must match styles.css:16-17 and @media 768/767
yaw rotation: portrait (aspect<0.8) rotates station -pi/2; layout coords are pre-rotation (Station3D.tsx:37)
Module octagon rotated pi/8 so flat faces on ±X/±Z; faceDist() = centre->face (layout.ts:20)
Station2D duplicates fanAngles as fan() and doesn't import scene/* to keep three out of main chunk (Station2D.tsx:13)
three chunk is lazy (App.tsx:14); chunkSizeWarningLimit 1200 (vite.config.ts:17)
SPA fallback returns index.html 200 for any unknown path incl /api/* typos and missing /resume.pdf
PUBLIC_URL drives both redirect_uri and Secure flag; dev must use http://localhost:5173 (through Vite proxy), not :8080
STATIC_DIR/HOMESERVER_DATA relative to cwd; systemd WorkingDirectory=/opt/station/server
useAuth initializer has side effect (replaceState) - StrictMode double-invokes it (useAuth.ts:27)
HomeShip sets document.body.style.cursor directly while Selectable uses useCursor -> can fight (HomeShip.tsx:159)
owner prefs: Cloudflare/Tailscale/Google = shared systems on main ship; Pulse + Portainer intentionally absent from homeserver.json
deploy.sh rebuilds web/dist in place while serving (vite empties outDir first)

## TODO
web/src/data/portfolio.ts:1-60 placeholder profile/experience/contacts (your-handle)
web/src/data/projects.ts:13-31 placeholder projects
web/public/resume.pdf missing but profile.resumeUrl='/resume.pdf' (portfolio.ts:8)
no tests, no eslint, no CI
