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

# 3.5 Activate virtual environment
if [ -f "./.venv/bin/activate" ]; then
    echo "🐍 Activating virtual environment..."
    source ./.venv/bin/activate
fi

# 3.6 Build React apps and collect static files
echo "🏗️ Building React apps..."
for app in passcheck liveticker scorecard gameday_designer; do
    if [ -d "$app" ]; then
        echo "  Building $app..."
        npm --prefix "$app/" install
        npm --prefix "$app/" run build
    fi
done

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

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
