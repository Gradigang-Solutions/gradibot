#!/bin/bash
# Refresh YouTube cookies and optionally push to Railway.
# Usage: ./scripts/refresh-cookies.sh [browser] [railway-service]
# Example: ./scripts/refresh-cookies.sh firefox gradibot
# Cron (daily at 6am): 0 6 * * * /path/to/refresh-cookies.sh firefox gradibot

set -euo pipefail

BROWSER="${1:-firefox}"
SERVICE="${2:-}"

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
printf "# Netscape HTTP Cookie File\n\n" > "$TMPFILE"

yt-dlp --cookies-from-browser "$BROWSER" --cookies "$TMPFILE" --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ" || true

COOKIES_B64=$(base64 -w 0 "$TMPFILE")

if [ -n "$SERVICE" ]; then
  railway variables set "YT_DLP_COOKIES=$COOKIES_B64" --service "$SERVICE"
  echo "Cookies pushed to Railway service: $SERVICE"
else
  echo "$COOKIES_B64"
fi
