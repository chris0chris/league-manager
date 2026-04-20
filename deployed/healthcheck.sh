#!/bin/sh
set -e

# Health check: verify backend is accessible on port 8000
# Use nc (netcat) for a simple TCP connection check - no Host header issues
if nc -z -w 2 backend 8000 2>/dev/null; then
  echo "Backend healthy (port 8000 responding)"
  exit 0
else
  echo "Backend health check failed"
  exit 1
fi
