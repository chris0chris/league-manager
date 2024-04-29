import re

from django.http import HttpResponseRedirect
from django.conf import settings
from django.urls import reverse

from league_manager.urls import LEAGUE_MANAGER_MAINTENANCE


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.MAINTENANCE_MODE:
            for maintenance_pattern in settings.MAINTENANCE_PAGES:
                if re.match(maintenance_pattern, request.path_info):
                    return HttpResponseRedirect(reverse(LEAGUE_MANAGER_MAINTENANCE))
        response = self.get_response(request)
        return response
