#!/usr/bin/env bash
# Run on the LXC from the repo checkout (/opt/station): pull, build both halves, restart.
set -euo pipefail
cd "$(dirname "$0")/.."

# Node sizes its heap from the container's RAM; on a small LXC that is ~250 MB, too little for the three.js
# bundle (vite OOMs while transforming). Give the build more, or override: NODE_HEAP_MB=2048 deploy/deploy.sh
# If the LXC has less RAM than this, add swap (or build elsewhere and copy web/dist) instead of raising it.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=${NODE_HEAP_MB:-1536}"

git pull --ff-only
(cd web && npm ci && npm run build)
(cd server && cargo build --release)
sudo systemctl restart station
systemctl --no-pager --lines=5 status station
