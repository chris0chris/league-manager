from .base import *

DEBUG = True
DEBUG_TOOLBAR = True
# DEBUG_TOOLBAR = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

if DEBUG_TOOLBAR:
    INSTALLED_APPS = INSTALLED_APPS + [
        'debug_toolbar',
    ]
    MIDDLEWARE = MIDDLEWARE + [
        'debug_toolbar.middleware.DebugToolbarMiddleware',
    ]

INTERNAL_IPS = ['127.0.0.1']
