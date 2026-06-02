#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_METRO_PORT:-8081}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v iproxy >/dev/null 2>&1; then
  echo "Install libimobiledevice first:  brew install libimobiledevice"
  exit 1
fi

stale_pids="$(lsof -ti :"$PORT" 2>/dev/null || true)"
if [[ -n "$stale_pids" ]]; then
  echo "Stopping stale Metro on port $PORT..."
  kill $stale_pids 2>/dev/null || true
  sleep 1
fi

pkill -f "iproxy ${PORT} ${PORT}" 2>/dev/null || true
iproxy "$PORT" "$PORT" >/dev/null 2>&1 &
IPROXY_PID=$!
trap 'kill $IPROXY_PID 2>/dev/null || true' EXIT

cat <<EOF

NeoTherm Metro (USB)
────────────────────
1. Keep iPhone connected by USB and unlock the device.
2. In the NeoTherm dev build, enter URL manually:

   http://127.0.0.1:${PORT}

EOF

exec npx expo start --dev-client --clear --localhost --port "$PORT"
