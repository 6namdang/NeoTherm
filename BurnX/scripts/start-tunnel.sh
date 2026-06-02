#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_METRO_PORT:-8081}"
NGROK_API="http://127.0.0.1:4040"
NGROK_LOG="/tmp/neotherm-ngrok.log"
NGROK_CONFIG="${NGROK_CONFIG:-${HOME}/Library/Application Support/ngrok/ngrok.yml}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_ngrok_bin() {
  local candidate dir

  if [[ -n "${NGROK_BIN:-}" && -x "$NGROK_BIN" ]]; then
    echo "$NGROK_BIN"
    return 0
  fi

  for candidate in \
    "/opt/homebrew/bin/ngrok" \
    "/usr/local/bin/ngrok"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  IFS=':' read -r -a path_dirs <<< "${PATH:-}"
  for dir in "${path_dirs[@]}"; do
    [[ "$dir" == *node_modules* ]] && continue
    candidate="${dir%/}/ngrok"
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

NGROK_BIN="$(resolve_ngrok_bin || true)"

if [[ -z "$NGROK_BIN" ]]; then
  echo "ngrok CLI v3 not found."
  echo "npm puts @expo/ngrok v2 on PATH; install the real CLI:"
  echo "  brew install --cask ngrok"
  echo "Then:  ngrok config add-authtoken YOUR_TOKEN   (free at https://ngrok.com)"
  exit 1
fi

ngrok_major="$("$NGROK_BIN" version 2>/dev/null | sed -nE 's/^ngrok version ([0-9]+).*/\1/p')"
if [[ "${ngrok_major:-0}" -lt 3 ]]; then
  echo "Found ngrok v2 at: $NGROK_BIN"
  echo "Install ngrok v3:  brew install --cask ngrok"
  exit 1
fi

if [[ ! -f "$NGROK_CONFIG" ]]; then
  echo "Ngrok config not found at:"
  echo "  $NGROK_CONFIG"
  echo "Run:  ngrok config add-authtoken YOUR_TOKEN"
  exit 1
fi

NGROK_AUTHTOKEN="${NGROK_AUTHTOKEN:-$(grep -E '^[[:space:]]*authtoken:' "$NGROK_CONFIG" | head -1 | sed -E 's/^[[:space:]]*authtoken:[[:space:]]*//')}"

if [[ -z "$NGROK_AUTHTOKEN" ]]; then
  echo "No authtoken found in $NGROK_CONFIG"
  echo "Run:  ngrok config add-authtoken YOUR_TOKEN"
  exit 1
fi

stop_ngrok() {
  pkill -x ngrok 2>/dev/null || true
  local api_pids
  api_pids="$(lsof -ti :4040 2>/dev/null || true)"
  if [[ -n "$api_pids" ]]; then
    kill $api_pids 2>/dev/null || true
  fi
}

cleanup() {
  if [[ -n "${NGROK_PID:-}" ]]; then
    kill "$NGROK_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

stale_metro="$(lsof -ti :"$PORT" 2>/dev/null || true)"
if [[ -n "$stale_metro" ]]; then
  echo "Stopping stale Metro on port $PORT..."
  kill $stale_metro 2>/dev/null || true
  sleep 1
fi

echo "Stopping any other ngrok sessions (close other ngrok terminals first)..."
stop_ngrok
sleep 1

: >"$NGROK_LOG"
echo "Starting ngrok tunnel to localhost:${PORT}..."
echo "Using ngrok: $NGROK_BIN ($("$NGROK_BIN" version 2>/dev/null | head -1))"
"$NGROK_BIN" http "$PORT" \
  --config "$NGROK_CONFIG" \
  --authtoken "$NGROK_AUTHTOKEN" \
  --log=stdout >"$NGROK_LOG" 2>&1 &
NGROK_PID=$!

tunnel_url=""
for _ in $(seq 1 60); do
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    break
  fi

  if curl -fsS "$NGROK_API/api/tunnels" >/dev/null 2>&1; then
    tunnel_json="$(curl -fsS "$NGROK_API/api/tunnels")"
    tunnel_url="$(printf '%s' "$tunnel_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for tunnel in data.get('tunnels', []):
    url = tunnel.get('public_url') or ''
    if url.startswith('https://'):
        print(url)
        break
")"
  fi

  if [[ -n "$tunnel_url" ]]; then
    break
  fi
  sleep 0.25
done

if [[ -z "$tunnel_url" ]]; then
  echo "Could not start ngrok tunnel."
  echo "Config: $NGROK_CONFIG"
  echo ""
  echo "Last ngrok log lines:"
  tail -n 10 "$NGROK_LOG" 2>/dev/null || true
  echo ""
  if grep -q "ERR_NGROK_4018" "$NGROK_LOG" 2>/dev/null; then
    echo "Ngrok rejected the authtoken (ERR_NGROK_4018)."
    echo "  1. Confirm your account at https://dashboard.ngrok.com"
    echo "  2. Copy a fresh token: ngrok config add-authtoken YOUR_TOKEN"
    echo "  3. Quit any other running ngrok (e.g. ngrok http 80 in another tab)"
  elif grep -q "ERR_NGROK_121" "$NGROK_LOG" 2>/dev/null; then
    echo "Ngrok v2 was used (ERR_NGROK_121). npm's @expo/ngrok is too old."
    echo "  brew install --cask ngrok"
    echo "  npm run start:tunnel   (script prefers Homebrew ngrok v3)"
  fi
  exit 1
fi

export EXPO_PACKAGER_PROXY_URL="$tunnel_url"

cat <<EOF

NeoTherm Metro (ngrok tunnel)
─────────────────────────────
Public bundler URL:  ${tunnel_url}
Dev client deep link uses this via EXPO_PACKAGER_PROXY_URL.

If the app does not open automatically, enter in the dev build:
  ${tunnel_url}

EOF

# Keep ngrok running; Metro owns this terminal from here.
trap - EXIT INT TERM
exec npx expo start --dev-client --clear --host lan --port "$PORT"
