#!/bin/sh
set -e

URL="http://localhost/login/"
ORIGIN="https://leaguesphere.app"

# 0. Check if service is up
UP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$UP_STATUS" -ne 200 ]; then
  echo "Service not responding properly (status=$UP_STATUS)"
  exit 1
fi

# 1. Cookie + CSRF-Token von Login-Form holen
COOKIE_JAR=$(mktemp)

# CSRF Cookie extrahieren
CSRFTOKEN=$(grep csrftoken "$COOKIE_JAR" | awk '{print $7}')

if [ -z "$CSRFTOKEN" ]; then
  echo "No CSRF cookie set"
  exit 1
fi

# 2. POST mit Cookie + Token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$URL" \
  -H "Origin: $ORIGIN" \
  -H "Referer: $ORIGIN/login/" \
  -H "Cookie: csrftoken=$CSRFTOKEN" \
  -d "username=health&password=check")

# 3. Auswerten – akzeptiere 200
if [ "$STATUS" -eq 200 ]; then
  echo "CSRF healthcheck OK (status=$STATUS)"
  exit 0
else
  echo "CSRF healthcheck failed (status=$STATUS)"
  exit 1
fi
