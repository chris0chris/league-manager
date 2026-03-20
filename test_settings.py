from league_manager.settings.dev import *
import os

# live_server with SQLite requires a shared file database, :memory: won't work.
# Using a single-threaded WSGI server (see scorecard/tests/e2e/conftest.py) to
# serialize concurrent write requests and avoid SQLite's SQLITE_LOCKED errors.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "test_db_shared.sqlite3",
        "OPTIONS": {
            "timeout": 30,
        },
    }
}
SECRET_KEY = "test-secret-key"

# Required for Playwright + Django sync testing to prevent SynchronousOnlyOperation
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
