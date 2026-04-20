#!/bin/sh
set -e

URL="http://localhost/login/"
ORIGIN="https://demo.leaguesphere.app"

# 0. Check if service is up
UP_STATUS=$(curl -A healthcheck-status -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$UP_STATUS" -ne 200 ]; then
  echo "Service not responding properly (status=$UP_STATUS)"
  exit 1
fi

# 1. Get CSRF token from login form
COOKIE_JAR=$(mktemp)
curl -A healthcheck-csrf-get -s -c "$COOKIE_JAR" "$URL" > /dev/null

CSRFTOKEN=$(grep csrftoken "$COOKIE_JAR" | awk '{print $7}')

if [ -z "$CSRFTOKEN" ]; then
  echo "No CSRF cookie set"
  exit 1
fi

# 2. POST login with demo credentials - expect 302 redirect on success
STATUS=$(curl -A healthcheck-login -s -o /dev/null -w "%{http_code}" \
  -X POST "$URL" \
  -H "Origin: $ORIGIN" \
  -H "Referer: $ORIGIN/login/" \
  -H "Cookie: csrftoken=$CSRFTOKEN" \
  -d "csrfmiddlewaretoken=$CSRFTOKEN&username=user%40demo.local&password=DemoUser123%21")

if [ "$STATUS" -eq 302 ]; then
  echo "Demo login healthcheck OK (status=$STATUS)"
  exit 0
else
  echo "Demo login healthcheck failed (status=$STATUS, expected 302)"
  exit 1
fi
