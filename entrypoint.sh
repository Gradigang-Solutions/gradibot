#!/bin/sh
if [ -n "$YT_DLP_COOKIES" ]; then
  printf '%s' "$YT_DLP_COOKIES" | base64 -d > /app/cookies.txt
  export YT_DLP_COOKIES_FILE=/app/cookies.txt
fi
exec node dist/main.js
