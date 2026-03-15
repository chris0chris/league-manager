#!/bin/zsh
set -e

# 1. Setup container and database
echo "📦 Initializing test container and database..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
./spinup_test_db.sh "$@"
cd ..

# 2. Get the actual IP of servyy-test
echo "🔍 Discovering container IP..."
# Extracting the first IPv4 address from the eth0 interface
CONTAINER_IP=$(lxc list servyy-test --format json | jq -r '.[0].state.network.eth0.addresses[] | select(.family=="inet") | .address' | head -n 1)

if [ -z "$CONTAINER_IP" ]; then
    echo "❌ Error: Could not determine IP for servyy-test"
    exit 1
fi
echo "✅ Found IP: $CONTAINER_IP"

# 3. Export environment variables
export league_manager=dev
export SECRET_KEY='django-insecure-default-key-for-dev'
export MYSQL_HOST="$CONTAINER_IP"
export MYSQL_DB_NAME=test_db
export MYSQL_USER=user
export MYSQL_PWD=user

# 3.5 Sync Python dependencies
echo "🐍 Syncing Python dependencies..."
uv sync --extra test

# 3.6 Build React apps and collect static files
HOT_MODE=false
HOT_APPS=""

# Parse arguments for hot mode
# Zsh arrays are 1-indexed
local_args=("$@")
for ((i=1; i<=$#; i++)); do
    if [[ "${local_args[$i]}" == "--hot" ]]; then
        HOT_MODE=true
        # Check next argument
        if [[ $((i+1)) -le $# ]]; then
            next_arg="${local_args[$((i+1))]}"
            if [[ -n "$next_arg" && "$next_arg" != --* ]]; then
                HOT_APPS="$next_arg"
            else
                HOT_APPS="all"
            fi
        else
            HOT_APPS="all"
        fi
        break
    fi
done

if [ "$HOT_MODE" = true ]; then
    export HOT_APPS="$HOT_APPS"
    echo "🔥 Hot-reloading mode enabled for: $HOT_APPS"
    
    # Define all apps
    apps=("gameday_designer" "passcheck" "liveticker" "scorecard")
    
    for app in "${apps[@]}"; do
        if [ -d "$app" ]; then
            # Check if we should start this app (hot) or build it (static)
            if [[ "$HOT_APPS" == "all" ]] || [[ "$HOT_APPS" == *"$app"* ]]; then
                echo "  Starting $app dev server..."
                npm --prefix "$app/" install --silent
                npm --prefix "$app/" start > "/tmp/vite-$app.log" 2>&1 &
            else
                echo "  Building $app (static)..."
                npm --prefix "$app/" install --silent
                npm --prefix "$app/" run build
            fi
        fi
    done
else
    echo "🏗️ Building React apps..."
    for app in passcheck liveticker scorecard gameday_designer; do
        if [ -d "$app" ]; then
            echo "  Building $app..."
            npm --prefix "$app/" install --silent
            npm --prefix "$app/" run build
        fi
    done
    echo "📦 Collecting static files..."
    python manage.py collectstatic --noinput
fi

if [ "$HOT_MODE" = true ]; then
    # We still need to collect static for the apps that were built statically
    # And potentially for Django's own static files (admin, etc)
    echo "📦 Collecting static files..."
    python manage.py collectstatic --noinput
fi

# 4. Run migrations
echo "🔄 Running database migrations..."
python manage.py migrate --no-input

# 4.1 Import test data if --fresh was passed
for arg in "$@"; do
    if [[ "$arg" == "--fresh" ]]; then
        echo "📥 Importing test data from dump..."
        ssh servyy-test.lxd "docker exec -i mysql mariadb -uuser -puser test_db" < "$SCRIPT_DIR/test_db_dump.sql"
        break
    fi
done

# 5. Create default user (admin/admin)
echo "👤 Creating default admin user..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')" | python manage.py shell

# 7. Start dev server
echo "🌐 Starting development server at http://localhost:8000 (DB at $MYSQL_HOST)"
python manage.py runserver 0.0.0.0:8000 --insecure
