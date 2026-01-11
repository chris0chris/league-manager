import os

from django.contrib import messages

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = os.environ.get("SECRET_KEY")

CORS_ORIGIN_ALLOW_ALL = True

# Application definition

INSTALLED_APPS = [
    "gamedays.apps.GamedaysConfig",
    "crispy_forms",
    "crispy_bootstrap5",
    "dal",
    "dal_select2",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.sitemaps",
    "league_manager",
    "rest_framework",
    "scorecard",
    "liveticker",
    "league_table",
    "corsheaders",
    "teammanager",
    "officials",
    "accounts",
    "knox",
    "passcheck",
    "gameday_designer",
    "health_check",
    "health_check.contrib.db_heartbeat",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "league_manager.middleware.maintenance.MaintenanceModeMiddleware",
]

PAGES_LINKS = {
    "GENERIC_GAME_SCHEDULE_GOOGLE_SHEETS": "https://docs.google.com/spreadsheets/d/1YRZk1Gt4OzBVzUamRIktJOFrMhmvGMk0ziGxmeih-ZY/edit?usp=sharing",
}

ROOT_URLCONF = "league_manager.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.request",
                "league_manager.context_processors.global_menu",
                "league_manager.context_processors.version_number",
                "league_manager.context_processors.pages_links",
            ],
        },
    },
]

MESSAGE_TAGS = {
    messages.ERROR: "danger",
}

WSGI_APPLICATION = "league_manager.wsgi.application"

# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases


# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Sites framework
SITE_ID = 1

# Sitemap domain configuration
# Override in environment-specific settings (dev.py, prod.py)
SITEMAP_DOMAIN = "example.com"  # Default for tests

# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = "de-de"

USE_I18N = True
TIME_ZONE = "Europe/Berlin"

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "league_manager/static")

MEDIA_ROOT = os.path.join(BASE_DIR, "media")
MEDIA_URL = "/media/"

# Crispy
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

LOGIN_REDIRECT_URL = "league-home"
LOGIN_URL = "login"

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_AUTHENTICATION_CLASSES": ("knox.auth.TokenAuthentication",),
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("MYSQL_DB_NAME", "test_db"),
        # 'NAME': 'test_5erdffl$league_manager',
        # 'NAME': 'test_demodffl$default',
        "USER": os.environ.get("MYSQL_USER", "user"),
        "PASSWORD": os.environ.get("MYSQL_PWD", "user"),
        "HOST": os.environ.get("MYSQL_HOST", "127.0.0.1"),
        "PORT": os.environ.get("MYSQL_PORT", "3306"),
        "OPTIONS": {
            "init_command": "SET default_storage_engine=InnoDB;"  # SET foreign_key_checks = 0;',
        },
    },
}

MOODLE_URL = os.environ.get("MOODLE_URL")
MOODLE_WSTOKEN = os.environ.get("MOODLE_WSTOKEN")
EQUIPMENT_APPROVAL_ENDPOINT = os.environ.get("EQUIPMENT_APPROVAL_ENDPOINT")
EQUIPMENT_APPROVAL_TOKEN = os.environ.get("EQUIPMENT_APPROVAL_TOKEN")

MAINTENANCE_MODE = False
MAINTENANCE_PAGES = [
    "/gamedays/gameday/new/",
    r"^/gamedays/gameday/\d+/update$",
    "/passcheck/player/create",
    r"^/passcheck/player/\d+/update$",
    "/officials/gameday/sign-up",
]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "file": {
            "level": "DEBUG",
            "class": "logging.FileHandler",
            "filename": "debug.log",
        },
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
    },
}

# ToDo deleteMe
X_FRAME_OPTIONS = "ALLOWALL"
