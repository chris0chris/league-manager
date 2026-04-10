import re

from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.urls import reverse

from league_manager.constants import LEAGUE_MANAGER_MAINTENANCE, MAINTENANCE_CONFIG_CACHE_KEY
from league_manager.models import SiteConfiguration


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        config = cache.get("%s" % MAINTENANCE_CONFIG_CACHE_KEY)

        if config is None:
            db_config = SiteConfiguration.objects.first()
            if db_config:
                config = {
                    "mode_active": db_config.maintenance_mode,
                    "patterns": db_config.maintenance_pages,
                }
            else:
                config = {"mode_active": False, "patterns": []}

            cache.set(MAINTENANCE_CONFIG_CACHE_KEY, config, 6000000)

        if config["mode_active"]:
            for maintenance_pattern in config["patterns"]:
                if re.match(maintenance_pattern, request.path_info):
                    return HttpResponseRedirect(reverse(LEAGUE_MANAGER_MAINTENANCE))

        response = self.get_response(request)
        return response
