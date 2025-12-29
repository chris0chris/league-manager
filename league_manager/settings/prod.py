# noinspection PyUnresolvedReferences
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'leaguesphere.app', 'www.leaguesphere.app', 'localhost', 'django',
                 'stage.leaguesphere.app', 'www.stage.leaguesphere.app']
CSRF_TRUSTED_ORIGINS = ['https://leaguesphere.app', 'https://www.leaguesphere.app',
                        'https://stage.leaguesphere.app', 'https://www.stage.leaguesphere.app']

# Sitemap domain for production
SITEMAP_DOMAIN = 'leaguesphere.app'
