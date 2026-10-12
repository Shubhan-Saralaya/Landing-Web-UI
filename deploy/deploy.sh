#!/usr/bin/env bash
# Run on the LXC from the repo checkout (/opt/station): pull, build both halves, restart.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
(cd web && npm ci && npm run build)
(cd server && cargo build --release)
sudo systemctl restart station
systemctl --no-pager --lines=5 status station
