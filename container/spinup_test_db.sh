#!/bin/zsh

# Usage: ./spinup_test_db.sh [--fresh]
# By default, preserves existing database and restarts the container if it exists
# Use --fresh flag to completely reset the database and import test data from test_db_dump.sql

FRESH_START=false

# Parse command line arguments
if [[ "$1" == "--fresh" ]]; then
    FRESH_START=true
fi

echo "starting test container"
pushd ~/dev/infrastructure/container/scripts/
./setup_test_container.sh
popd
sleep 10

echo "starting test db"

if [[ "$FRESH_START" == true ]]; then
    echo "🔄 Fresh start: removing existing database..."
    ssh servyy-test.lxd "docker rm -f mysql"
    sleep 5
    ssh servyy-test.lxd "docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=user -e MYSQL_DATABASE=test_db mariadb:lts"
    sleep 20
    echo "setup test db"
    ssh servyy-test.lxd "docker exec -i mysql mariadb -puser -uroot "< test_user.sql
else
    # Check if container exists
    if ssh servyy-test.lxd "docker ps -a --format '{{.Names}}' | grep -q '^mysql$'"; then
        echo "♻️  Reusing existing database, restarting container..."
        ssh servyy-test.lxd "docker restart mysql"
        sleep 10
    else
        echo "📦 No existing database found, creating new one..."
        ssh servyy-test.lxd "docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=user -e MYSQL_DATABASE=test_db mariadb:lts"
        sleep 20
        echo "setup test db"
        ssh servyy-test.lxd "docker exec -i mysql mariadb -puser -uroot "< test_user.sql
    fi
fi

echo "✅ Test database is ready"
