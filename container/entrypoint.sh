#!/bin/sh

# Run migrations only if RUN_MIGRATIONS is set to "true"
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    python manage.py makemigrations --no-input
    python manage.py migrate --no-input
fi

exec "$@"
