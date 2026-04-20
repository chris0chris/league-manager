#!/bin/sh

# Run migrations only if RUN_MIGRATIONS is set to "true"
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    python manage.py migrate --no-input || { echo "Migrations failed, aborting startup"; exit 1; }
fi

# Always collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || { echo "Collecting static files failed"; exit 1; }

exec "$@"
