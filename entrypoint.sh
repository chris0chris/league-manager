#!/bin/sh

python manage.py makemigrations --no-input
python manage.py migrate  --no-input
python manage.py collectstatic --no-input --clear

exec "$@"
