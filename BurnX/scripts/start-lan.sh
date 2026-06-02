#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_METRO_PORT:-8081}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

stale_pids="$(lsof -ti :"$PORT" 2>/dev/null || true)"
if [[ -n "$stale_pids" ]]; then
  echo "Stopping stale Metro on port $PORT..."
  kill $stale_pids 2>/dev/null || true
  sleep 1
fi

lan_ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "$lan_ip" ]]; then
  lan_ip="$(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')"
fi

cat <<EOF

NeoTherm Metro (LAN)
────────────────────
Bundler URL for the dev build:  http://${lan_ip:-YOUR_MAC_IP}:${PORT}

If the phone shows "No development servers found":
  1. Dev menu → Enter URL manually → paste the URL above
  2. iPhone Settings → NeoTherm → Local Network → ON
  3. Same Wi‑Fi on Mac and iPhone (not guest / isolated Wi‑Fi)

Campus or office Wi‑Fi often blocks phone → Mac traffic even on the same network.
If manual URL times out, use one of these instead:
  • iPhone Personal Hotspot → connect Mac to the hotspot → run npm run start:lan again
  • USB: npm run start:usb  (needs: brew install libimobiledevice)
  • Tunnel: npm run start:tunnel  (works when ngrok connects)

After changing app.json iOS keys, rebuild once: npm run ios:device

EOF

exec npx expo start --dev-client --clear --host lan --port "$PORT"
