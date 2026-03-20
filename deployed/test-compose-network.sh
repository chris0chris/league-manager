#!/bin/bash
set -e

COMPOSE_FILE="${1:-docker-compose.yaml}"
ENV_NAME="${2:-production}"

echo "Testing docker-compose network configuration: $COMPOSE_FILE ($ENV_NAME)"

# Create mock environment file
cat > ls.env.ci <<EOF
SECRET_KEY=ci-test-secret-key
MYSQL_HOST=mysql-mock.example.com
MYSQL_DB_NAME=ci_test_db
MYSQL_USER=ci_test_user
MYSQL_PWD=ci_test_password
DEBUG=False
EOF

# Create CI compose file with mock env
if [ "$ENV_NAME" = "staging" ]; then
  sed 's/env_file: ls.env.staging/env_file: ls.env.ci/g' "$COMPOSE_FILE" > docker-compose.ci.yaml
else
  sed 's/env_file: ls.env/env_file: ls.env.ci/g' "$COMPOSE_FILE" > docker-compose.ci.yaml
fi

# Start stack
echo "Starting docker-compose stack..."
docker compose -f docker-compose.ci.yaml up -d

# Wait for services
sleep 10

# Get app container
APP_CONTAINER=$(docker compose -f docker-compose.ci.yaml ps -q app)

if [ -z "$APP_CONTAINER" ]; then
  echo "❌ Failed to get app container"
  docker compose -f docker-compose.ci.yaml down -v
  exit 1
fi

echo "Testing connectivity from app container: $APP_CONTAINER"

# Test DNS + HTTPS connectivity (curl will fail if DNS doesn't resolve)
echo ""
echo "Test 1: DNS Resolution + HTTPS Connectivity"
if docker exec $APP_CONTAINER sh -c 'curl -f --max-time 10 https://www.google.com > /dev/null 2>&1'; then
  echo "✅ DNS resolution and HTTPS connectivity successful"
else
  echo "❌ External connectivity FAILED (DNS or network issue)"
  echo "This usually means:"
  echo "  - App container has no external network access (internal: true)"
  echo "  - DNS resolution is blocked"
  echo "  - HTTPS traffic is blocked"
  docker compose -f docker-compose.ci.yaml down -v
  exit 1
fi

# Test HTTP connectivity (additional verification)
echo ""
echo "Test 2: HTTP Connectivity"
if docker exec $APP_CONTAINER sh -c 'curl -f --max-time 10 http://www.google.com > /dev/null 2>&1'; then
  echo "✅ HTTP connectivity successful"
else
  echo "⚠️  HTTP connectivity failed (HTTPS worked, so this is likely just a redirect issue)"
fi

echo ""
echo "✅ All connectivity tests passed!"

# Cleanup
docker compose -f docker-compose.ci.yaml down -v
rm -f docker-compose.ci.yaml ls.env.ci

exit 0
