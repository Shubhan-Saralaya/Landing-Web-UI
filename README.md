# Shubhan Station

Personal portfolio + homeserver hub at **shubhanx86.com**, presented as an interactive space station:

- **Main ship** (portfolio): experience, skills, contact, and the shared systems (Cloudflare, Tailscale, Google).
- **Shipyard** (side ship 1): open projects that will be self-hosted, coming soon.
- **Homeserver ship** (side ship 2): Proxmox core → node rooms (home2, home4) → guest pods. Anyone can see
  what's running; opening an app requires signing in with an allowlisted Google account (links are only sent
  to signed-in users).

`web/` is React + Vite + react-three-fiber (with a 2D SVG fallback). `server/` is a Rust axum binary that serves
the built site, runs Google OAuth, and returns the homeserver map only to signed-in allowlisted users.

## Setup

1. `cp .env.example .env` and fill in the Google client ID/secret, `ALLOWED_EMAILS` and `SESSION_SECRET`.
2. In Google Cloud Console → OAuth client → *Authorized redirect URIs*, add `https://shubhanx86.com/auth/callback`
   (and `http://localhost:5173/auth/callback` for local dev).

## Develop

```bash
cd server && cargo run          # API + auth on :8080 (set PUBLIC_URL=http://localhost:5173 in .env for dev)
cd web && npm install && npm run dev   # site on :5173, proxies /api and /auth to :8080
```

The frontend also runs without the server — the homeserver ship just stays locked.

## Content

- Portfolio: `web/src/data/portfolio.ts` (+ drop `resume.pdf` in `web/public/`)
- Projects: `web/src/data/projects.ts`
- Shared systems: `web/src/data/shared.ts`
- Homeserver map: `server/data/homeserver.json` (re-read on every request, no rebuild needed; `url` fields are
  only served to signed-in users)

## Deploy (LXC 112, home2-web)

One-time, inside the container (Debian/Ubuntu):

```bash
apt install -y git build-essential curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
curl https://sh.rustup.rs -sSf | sh -s -- -y
useradd --system --home /opt/station station
git clone <repo> /opt/station && cp .env /opt/station/.env   # PUBLIC_URL=https://shubhanx86.com
cp /opt/station/deploy/station.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable station
```

Then `deploy/deploy.sh` on each update. In the Cloudflare tunnel, route `shubhanx86.com` → `http://<lxc-ip>:8080`
(or `http://localhost:8080` if cloudflared runs in the same container).

### Cloudflare tunnel (token in `.env`)

1. Cloudflare Zero Trust → Networks → Tunnels → create a tunnel, copy its token, and add a public hostname
   `shubhanx86.com` → `http://localhost:8080`.
2. Put the token in `/opt/station/.env` as `TUNNEL_TOKEN=...` (the file is gitignored; `.env.example` has the name only).
3. Install [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
   on the LXC, then:
   ```bash
   sudo cp deploy/cloudflared-station.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now cloudflared-station
   ```
4. Locally (fish): `env (grep ^TUNNEL_TOKEN= .env) cloudflared tunnel run`.
