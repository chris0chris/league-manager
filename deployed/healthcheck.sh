#!/bin/sh
set -e

# Simple health check - just verify backend is responding through nginx
RESPONSE=$(curl -s -A healthcheck http://localhost/health/)

# Check if we got a valid JSON response with status: healthy
if echo "$RESPONSE" | grep -q '"status".*"healthy"'; then
  echo "Health check OK: $RESPONSE"
  exit 0
else
  echo "Health check failed: $RESPONSE"
  exit 1
fi
