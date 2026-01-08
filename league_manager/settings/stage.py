# noinspection PyUnresolvedReferences
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'stage.leaguesphere.app', 'localhost', 'django',
                 'leaguesphere-stage.lehel.xyz', 'leaguesphere-stage.lehel',
                 'stage.leaguesphere.servyy-test.lxd']
CSRF_TRUSTED_ORIGINS = ['https://stage.leaguesphere.app',
                        'https://leaguesphere-stage.lehel.xyz',
                        'http://leaguesphere-stage.lehel',
                        'https://stage.leaguesphere.servyy-test.lxd',
                        'https://leaguesphere.app']  # Workaround: Traefik rewrites Origin

# Sitemap domain for staging
SITEMAP_DOMAIN = 'stage.leaguesphere.app'

# Trust X-Forwarded-Proto header from nginx proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Trust X-Forwarded-Host header from reverse proxy chain (Traefik -> nginx)
USE_X_FORWARDED_HOST = True
