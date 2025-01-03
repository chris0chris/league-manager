import datetime

from .base import *

DEBUG = True
DEBUG_DATE = datetime.date(2024, 4, 13)

DEBUG_TOOLBAR = True
# DEBUG_TOOLBAR = False
# PROFILING = True
PROFILING = False
ALLOWED_HOSTS = ['127.0.0.1', '.ngrok-free.app', 'localhost', '172.21.0.3']

if PROFILING:
    INSTALLED_APPS = [
                         'silk',
                     ] + INSTALLED_APPS
    MIDDLEWARE = [
                     'silk.middleware.SilkyMiddleware',
                 ] + MIDDLEWARE
    SILKY_PYTHON_PROFILER = True

if DEBUG_TOOLBAR:
    INSTALLED_APPS = INSTALLED_APPS + [
        'debug_toolbar',
    ]
    MIDDLEWARE = MIDDLEWARE + [
        'debug_toolbar.middleware.DebugToolbarMiddleware',
    ]

INTERNAL_IPS = ['127.0.0.1']
