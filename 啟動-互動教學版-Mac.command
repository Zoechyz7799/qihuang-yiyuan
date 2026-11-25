#!/bin/bash
# Qi-Pulse interactive lesson - one-click local server (macOS)
# Double-click this file. Keep the Terminal window open while practising.
set -u

# Remove the "downloaded from the internet" flag after the first right-click Open.
xattr -d com.apple.quarantine "$0" >/dev/null 2>&1 || true

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || { echo "Cannot enter folder: $HERE"; read -r -n 1; exit 1; }

BASE_PORT="${QIMAI_PORT:-4719}"
PORT="$BASE_PORT"
SERVER_PID=""
LOG="/tmp/qimai-server-${BASE_PORT}.log"

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

healthy() {
  curl -s --noproxy '*' --max-time 2 "http://127.0.0.1:$1/practice.html" 2>/dev/null | grep -q 'bootPractice'
}

echo "=============================================="
echo " Qi-Pulse / 氣脈陪練 · 互動教學版"
echo "=============================================="

if healthy "$BASE_PORT"; then
  echo "OK  Existing server found on port $BASE_PORT. Opening the browser."
else
  # If the port is taken by something else, walk forward to a free one.
  for p in $(seq "$BASE_PORT" $((BASE_PORT + 8))); do
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then PORT="$p"; break; fi
  done
  echo "--> Starting local server on port $PORT ..."
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$HERE" >"$LOG" 2>&1 &
  SERVER_PID=$!
  READY=0
  for i in $(seq 1 30); do
    sleep 0.3
    if healthy "$PORT"; then READY=1; break; fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  done
  if [ "$READY" -ne 1 ]; then
    echo "FAILED to start the server. Error output:"
    tail -20 "$LOG" 2>/dev/null
    echo ""
    echo "Please screenshot the message above. Press any key to close..."
    read -r -n 1
    exit 1
  fi
  echo "OK  Server ready."
fi

URL="http://127.0.0.1:$PORT/practice.html"
echo ""
echo "  Practice : $URL"
echo "  Pet page : http://127.0.0.1:$PORT/"
echo ""
if [ "${QIMAI_NO_OPEN:-0}" != "1" ]; then
  open "$URL" 2>/dev/null || echo "(Could not open a browser automatically; paste the URL above.)"
fi
echo "IMPORTANT: keep this Terminal window open."
echo "Closing it stops the server and Chrome will show ERR_CONNECTION_REFUSED."
echo "Press Ctrl+C or close the window when you are done."
echo ""

if [ -n "$SERVER_PID" ]; then
  wait "$SERVER_PID"
else
  echo "(Server is provided by another window.) Press any key to close..."
  read -r -n 1
fi
