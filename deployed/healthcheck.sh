#!/bin/sh
set -e

# Simple health check - verify nginx can connect to backend
# We're inside the www container, so we can access backend directly
if curl -s -f http://backend:8000/health/ > /dev/null 2>&1; then
  echo "Health check OK"
  exit 0
else
  # Fallback: just check if we can connect to backend on port 8000
  if nc -z backend 8000 2>/dev/null; then
    echo "Backend TCP health check OK"
    exit 0
  else
    echo "Health check failed - backend not responding"
    exit 1
  fi
fi
