#!/bin/sh
set -e

# Health check: verify backend is accessible on port 8000
# Use bash's /dev/tcp for TCP connection check (works without nc)
(timeout 2 bash -c "</dev/tcp/backend/8000" 2>/dev/null) && exit 0 || (echo "Backend health check failed"; exit 1)
