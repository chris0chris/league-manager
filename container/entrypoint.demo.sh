#!/bin/bash
set -e

# entrypoint.demo.sh - Handles demo database initialization and midnight reset

RESET_FLAG_FILE="/app/.demo_last_reset"
DEMO_SNAPSHOT="/app/snapshots/demo_snapshot.sql"
LOGS_DIR="/app/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

log() {
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $1" | tee -a "$LOGS_DIR/demo_reset.log"
}

# Check if reset is needed (first run or past midnight UTC)
needs_reset() {
    local now=$(date -u +%s)
    local today_midnight=$(date -u -d "today 00:00:00" +%s)

    if [ ! -f "$RESET_FLAG_FILE" ]; then
        return 0  # First run, needs initialization
    fi

    local last_reset=$(cat "$RESET_FLAG_FILE")
    if [ "$now" -ge "$today_midnight" ] && [ "$last_reset" -lt "$today_midnight" ]; then
        return 0  # Past midnight since last reset
    fi

    return 1  # No reset needed
}

# Initialize database: run migrations and seed data
init_database() {
    log "Initializing demo database..."
    cd /app

    python manage.py migrate --noinput
    log "Migrations completed"

    python manage.py seed_demo_data
    log "Demo data seeded"

    # Create snapshot for resets
    mkdir -p "$(dirname "$DEMO_SNAPSHOT")"
    mysqldump -h"${MYSQL_HOST}" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
        --single-transaction --quick --lock-tables=false \
        "${MYSQL_DATABASE}" > "$DEMO_SNAPSHOT"
    log "Demo snapshot created at $DEMO_SNAPSHOT"
}

# Reset database from snapshot
reset_database() {
    log "Resetting demo database from snapshot..."

    if [ ! -f "$DEMO_SNAPSHOT" ]; then
        log "ERROR: Demo snapshot not found at $DEMO_SNAPSHOT"
        log "Initializing database instead..."
        init_database
        return
    fi

    # Drop and recreate database
    mysql -h"${MYSQL_HOST}" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" <<EOF
DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`;
CREATE DATABASE \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

    log "Database dropped and recreated"

    # Restore from snapshot
    mysql -h"${MYSQL_HOST}" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
        "${MYSQL_DATABASE}" < "$DEMO_SNAPSHOT"

    log "Database restored from snapshot"
}

# Main logic
if needs_reset; then
    if [ ! -f "$DEMO_SNAPSHOT" ]; then
        init_database
    else
        reset_database
    fi
    date -u +%s > "$RESET_FLAG_FILE"
fi

log "Entrypoint script completed, application ready"
