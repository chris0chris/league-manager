#!/bin/zsh
set -e

# Check for --demo flag
DEMO_MODE=false
for arg in "$@"; do
    [[ "$arg" == "--demo" ]] && DEMO_MODE=true
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ "$DEMO_MODE" = true ]; then
    echo "🎮 Starting in DEMO mode (SQLite database)..."
    # Demo mode uses SQLite - no container needed
    cd ..
else
    # 1. Setup container and database
    echo "📦 Initializing test container and database..."
    # Only pass --fresh to spinup if it was requested; other flags are not relevant to DB setup
    SPINUP_ARGS=()
    for arg in "$@"; do
        [[ "$arg" == "--fresh" ]] && SPINUP_ARGS+=(--fresh)
    done
    ./spinup_test_db.sh "${SPINUP_ARGS[@]}"
    cd ..
fi

# 2. Setup environment variables
if [ "$DEMO_MODE" = true ]; then
    echo "📝 Setting up demo environment variables..."
    export DJANGO_SETTINGS_MODULE=league_manager.settings.demo
    export SECRET_KEY='django-insecure-demo-key-for-local-testing'
    export DEMO_MODE=True
    export DEMO_RESET_HOUR=0
    export DEMO_RESET_MINUTE=0
    export EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
else
    echo "🔍 Discovering container IP..."
    # Extracting the first IPv4 address from the eth0 interface
    CONTAINER_IP=$(lxc list servyy-test --format json | jq -r '.[0].state.network.eth0.addresses[] | select(.family=="inet") | .address' | head -n 1)

    if [ -z "$CONTAINER_IP" ]; then
        echo "❌ Error: Could not determine IP for servyy-test"
        exit 1
    fi
    echo "✅ Found IP: $CONTAINER_IP"

    # 3. Export environment variables for test mode
    export league_manager=dev
    export SECRET_KEY='django-insecure-default-key-for-dev'
    export MYSQL_HOST="$CONTAINER_IP"
    export MYSQL_DB_NAME=test_db
    export MYSQL_USER=user
    export MYSQL_PWD=user
fi

# 3.5 Sync Python dependencies
echo "🐍 Syncing Python dependencies..."
uv sync --extra test

# 3.6 Build React apps and collect static files
HOT_MODE=false
HOT_APPS=""

# Parse arguments using a simple loop that handles flags and values
args=("$@")
for ((i=1; i<=$#; i++)); do
    arg="${args[$i]}"
    
    if [[ "$arg" == "--hot" ]]; then
        HOT_MODE=true
        # Check if next argument exists and is not a flag
        if [[ $((i+1)) -le $# ]]; then
            next_arg="${args[$((i+1))]}"
            if [[ "$next_arg" != --* ]]; then
                HOT_APPS="$next_arg"
                # Skip the app name in the next iteration
                ((i++))
            else
                HOT_APPS="all"
            fi
        else
            HOT_APPS="all"
        fi
    fi
done

if [ "$HOT_MODE" = true ]; then
    echo "🔥 Watch mode enabled for: $HOT_APPS"
    
    # Define all apps
    apps=("gameday_designer" "passcheck" "liveticker" "scorecard")
    
    for app in "${apps[@]}"; do
        if [ -d "$app" ]; then
            # Check if we should watch this app or build it once
            SHOULD_WATCH=false
            if [[ "$HOT_APPS" == "all" ]]; then
                SHOULD_WATCH=true
            elif [[ "$HOT_APPS" == *"$app"* ]]; then
                SHOULD_WATCH=true
            fi

            if [ "$SHOULD_WATCH" = true ]; then
                echo "  Starting $app in watch mode..."
                npm --prefix "$app/" install --silent
                # Run watch in background
                npm --prefix "$app/" run watch > "/tmp/vite-$app-watch.log" 2>&1 &
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
fi

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# 4. Run migrations
echo "🔄 Running database migrations..."
python manage.py migrate --no-input

# 4.1 Seed demo data or import test dump
if [ "$DEMO_MODE" = true ]; then
    echo "🌱 Seeding demo database with synthetic data..."
    python manage.py seed_demo_data
else
    # Import test data if --fresh was passed
    for arg in "$@"; do
        if [[ "$arg" == "--fresh" ]]; then
            echo "📥 Importing test data from dump..."
            ssh servyy-test.lxd "docker exec -i mysql mariadb -uuser -puser test_db" < "$SCRIPT_DIR/test_db_dump.sql"
            break
        fi
    done

    # 5. Create default user (admin/admin) for test mode
    echo "👤 Creating default admin user..."
    echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')" | python manage.py shell
fi

# 7. Start dev server
if [ "$DEMO_MODE" = true ]; then
    echo ""
    echo "🎮 DEMO MODE STARTED"
    echo "🌐 Server: http://localhost:8000"
    echo "💾 Database: SQLite (local)"
    echo ""
    echo "Demo Accounts:"
    echo "  admin@demo.local / DemoAdmin123!"
    echo "  referee@demo.local / DemoRef123!"
    echo "  manager@demo.local / DemoMgr123!"
    echo "  user@demo.local / DemoUser123!"
    echo ""
    echo "More info: http://localhost:8000/demo-info/"
    echo ""
else
    echo "🌐 Starting development server at http://localhost:8000 (DB at $MYSQL_HOST)"
fi
python manage.py runserver 0.0.0.0:8000 --insecure
