import re

from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.urls import reverse

from league_manager.constants import (
    LEAGUE_MANAGER_MAINTENANCE,
    MAINTENANCE_CONFIG_CACHE_KEY,
    MAINTENANCE_SCOPE_FULL,
    MAINTENANCE_SCOPE_OFF,
    MAINTENANCE_SCOPE_CUSTOM,
    MAINTENANCE_SCOPE_WRITES_ONLY,
)
from league_manager.models import SiteConfiguration

ADMIN_PREFIX = "/admin/"
MAINTENANCE_PREFIX = "/maintenance/"
WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        config = cache.get("%s" % MAINTENANCE_CONFIG_CACHE_KEY)

        if config is None:
            db_config = SiteConfiguration.objects.first()
            if db_config:
                config = {
                    "scope": db_config.maintenance_scope,
                    "patterns": db_config.maintenance_pages,
                }
            else:
                config = {"scope": MAINTENANCE_SCOPE_OFF, "patterns": []}

            cache.set(MAINTENANCE_CONFIG_CACHE_KEY, config, 6000000)

        path = request.path_info
        if self._is_exempt(path):
            return self.get_response(request)

        scope = config["scope"]

        if scope == MAINTENANCE_SCOPE_FULL:
            return HttpResponseRedirect(reverse(LEAGUE_MANAGER_MAINTENANCE))

        if scope == MAINTENANCE_SCOPE_WRITES_ONLY:
            if request.method in WRITE_METHODS:
                return HttpResponseRedirect(reverse(LEAGUE_MANAGER_MAINTENANCE))

        if scope == MAINTENANCE_SCOPE_CUSTOM:
            for maintenance_pattern in config["patterns"]:
                if re.match(maintenance_pattern, path):
                    return HttpResponseRedirect(reverse(LEAGUE_MANAGER_MAINTENANCE))

        return self.get_response(request)

    @staticmethod
    def _is_exempt(path):
        return (
            path.startswith(ADMIN_PREFIX)
            or path.startswith(MAINTENANCE_PREFIX)
            or path.startswith("/static/")
            or path.startswith("/media/")
        )
