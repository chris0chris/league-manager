import re

from django.conf import settings
from django.urls import reverse
from django_webtest import WebTest, DjangoWebtestResponse

from league_manager.urls import LEAGUE_MANAGER_MAINTENANCE


class TestMaintenanceView(WebTest):
    # @see base.py MAINTENANCE_PAGES
    def test_maintenance_page_is_delivered(self):
        expected_url = reverse(LEAGUE_MANAGER_MAINTENANCE)
        settings.MAINTENANCE_MODE = True

        for index, current_page in enumerate(settings.MAINTENANCE_PAGES):
            if '\\d+' in current_page:
                current_page_as_regex = current_page.replace('\\d+', str(index))
                current_page = current_page_as_regex[1:-1]
            response: DjangoWebtestResponse = self.client.get(
                current_page
            )
            assert response.url == expected_url

        settings.MAINTENANCE_MODE = False