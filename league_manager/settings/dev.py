import datetime
import sys

from .base import *

if not SECRET_KEY:
    SECRET_KEY = "django-insecure-local-dev-key-set-SECRET_KEY-env-var-in-production"

DEBUG = True
DEBUG_DATE = datetime.date.today()
# DEBUG_DATE = datetime.date(2026, 3, 21)

DEBUG_TOOLBAR = "pytest" not in sys.modules
# DEBUG_TOOLBAR = True
# DEBUG_TOOLBAR = False
# PROFILING = True
PROFILING = False
ALLOWED_HOSTS = [
    "127.0.0.1",
    ".ngrok-free.app",
    "localhost",
    "172.21.0.3",
    "django",
    "lm.servyy-test.lxd",
    "lm.servyy-test",
    "lm.lehel.xyz",
    "stage.leaguesphere.servyy-test.lxd",
    "testserver",
]

CSRF_TRUSTED_ORIGINS = [
    "https://lm.lehel.xyz",
    "https://lm.servyy-test.lxd",
    "https://stage.leaguesphere.servyy-test.lxd",
]

# Sitemap domain for development
SITEMAP_DOMAIN = "localhost:8000"

if PROFILING:
    INSTALLED_APPS = [
        "silk",
    ] + INSTALLED_APPS
    MIDDLEWARE = [
        "silk.middleware.SilkyMiddleware",
    ] + MIDDLEWARE
    SILKY_PYTHON_PROFILER = True

if DEBUG_TOOLBAR:
    INSTALLED_APPS = INSTALLED_APPS + [
        "debug_toolbar",
    ]
    MIDDLEWARE = MIDDLEWARE + [
        "debug_toolbar.middleware.DebugToolbarMiddleware",
    ]

def show_toolbar(request):
    """
    Callback to determine whether to show the debug toolbar.
    Returns False if the database is offline to prevent the toolbar
    from attempting to query the database and causing a crash.
    """
    from django.core.cache import cache
    if cache.get('db_connection_status') is False:
        return False
    return True

DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': show_toolbar,
}

INTERNAL_IPS = ["127.0.0.1"]
