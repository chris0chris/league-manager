# noinspection PyUnresolvedReferences
from .base import *

import os

DEBUG = False
MOCK_TEAMS = True

# Demo-specific secret key (not for production)
if not os.environ.get("SECRET_KEY"):
    SECRET_KEY = "demo-insecure-key-for-local-testing-only-not-for-production"
ALLOWED_HOSTS = [
    "demo.leaguesphere.app",
    "localhost",
    "127.0.0.1",
    "demo-nginx",
    "demo-app",
]

CSRF_TRUSTED_ORIGINS = [
    "https://demo.leaguesphere.app",
]

# Sitemap domain for demo
SITEMAP_DOMAIN = "demo.leaguesphere.app"

# Trust X-Forwarded-Proto header from nginx proxy
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Database configuration for demo environment
# Local dev uses SQLite, Docker uses MySQL
mysql_host = os.environ.get('MYSQL_HOST', 'demo-db')
if mysql_host == 'demo-db' and not os.environ.get('RUNNING_IN_DOCKER'):
    # Local development: use SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'db.demo.sqlite3'),
        }
    }
else:
    # Docker environment: use MySQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('MYSQL_DATABASE', 'demo_db'),
            'USER': os.environ.get('MYSQL_USER', 'demo_user'),
            'PASSWORD': os.environ.get('MYSQL_PASSWORD'),
            'HOST': mysql_host,
            'PORT': os.environ.get('MYSQL_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            }
        }
    }

# Security settings for demo
# Relax for local development, strict for production
if os.environ.get('RUNNING_IN_DOCKER'):
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Email backend - use console for demo (no external emails)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable external integrations in demo
STRIPE_ENABLED = False
EXTERNAL_API_INTEGRATIONS_ENABLED = False

# Demo-specific settings
DEMO_MODE = True
DEMO_RESET_HOUR = 0  # Midnight UTC
DEMO_RESET_MINUTE = 0

# Logging configuration for demo reset events
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'demo_reset.log',
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'demo.reset': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
    },
}
