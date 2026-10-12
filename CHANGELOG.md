# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Cloudflare tunnel service: `deploy/cloudflared-station.service` runs `cloudflared tunnel run` with `TUNNEL_TOKEN` from `.env`; documented in README, name added to `.env.example`.
- Data-driven homeserver: `server/data/homeserver.json` now carries each service's `logo` (built-in id, or a custom `{path,color}` 24x24 SVG path) and optional `layout` limits. A new guest appears in both 3D and 2D with no code change. Nodes with more than 6 services split into up to 3 sub-rooms ("home2 · 1/2"); anything beyond 18 per node is not drawn. Rooms sit on a spine, alternating sides, so the ship grows along +x and the camera framing follows (`scene/homeLayout.ts`). The hub reserves 4 side-ship slots (`MAX_SIDE_SHIPS`); only Shipyard + Homeserver exist today.
- `npm run check:layout` stress-tests splitting, caps and spacing up to 144 pods.
- Shared-service logos on the hub now come from `data/shared.ts` (`logo` field, up to 4).
- 2D view parity: roof logos on modules/pods/core, bigger rooms and pods, service names (Services toggle), powered-down homeserver (dark core and corridor, grey logos), plus drag-to-pan, wheel/pinch zoom, zoom slider and reset. Camera overlay now shows in both modes (`pan2d` in `scene/cameraControl.ts`).
- "Services" toggle in the camera overlay (on by default, remembered in `localStorage`): names every service above its logo in all views, not only when its ship is selected. Off = names only on hover. Prop: `StationProps.showServices`.
- Selecting a ship names every service above its logo (homeserver pods; Cloudflare/Tailscale/Google on the main ship). Hover still adds online/offline status.
- Roof logos: Proxmox on the reactor core, each homeserver guest on its pod (grey when offline), Cloudflare/Tailscale on the main ship's arm modules and Google on the +X junction. Glyphs from simple-icons live in `scene/logos.ts`; `Module` takes a `logo` prop (`scene/RoofLogo.tsx`).
- Camera overlay (3D mode): Reset view button, zoom slider and a "click & drag" hint that quiets after the first drag. Camera state moved to `scene/cameraControl.ts`.
- Camera control: drag to orbit, wheel/pinch to zoom, double-click to reset (also resets on focus change). Clicks ending a drag no longer select ships or open pods (`dragState` in `scene/CameraRig.tsx`).
- TEST-only username/password login: setting `TEST_LOGIN_USER` + `TEST_LOGIN_PASSWORD` disables Google OAuth (`/auth/login`, `/auth/callback` return 404, `GOOGLE_*` no longer required) and enables `POST /auth/test-login`. `/api/me` now returns `mode`.

### Changed
- Font: Space Grotesk -> Inter (JetBrains Mono kept for codes/labels).
- Homeserver lock state is now "powered down" instead of a red force field: lights, core, cage and logos fade dark when locked and ease back on when cleared (`homeLights`/`setHomePower` in `scene/materials.ts`, corridor `lights` prop). Red alarm beacons, sealed red airlock and the 2D shield were removed.
- Homeserver rooms and pods ~1.4-1.7x bigger (wider spacing, larger shield, camera framing 7.2 -> 9.2, overview 21 -> 23); roof logos ~2.5x bigger.

### Fixed
- `deploy/deploy.sh` raises Node's heap (`NODE_HEAP_MB`, default 1536) so `vite build` no longer runs out of memory on the small LXC.
- Camera hint no longer overlaps the sector nav; test-login form fills the airlock banner and is styled.

## 2026-10-11

### Added
- Initial audit and repo setup: `.ai/CODEBASE.md` (agent guide), `.ai/REVIEW.md` (code review), `CHANGELOG.md`.

### Changed
- Added `.gitattributes` (LF for deploy scripts).
- Hardened `.gitignore` (env variants, tsbuildinfo, local Claude settings, editor files).
- Shortened `CLAUDE.md` to point at `.ai/CODEBASE.md` and added working rules.
