import re
from unittest.mock import patch, MagicMock

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.http import HttpRequest
from django.test import TestCase, RequestFactory
from django.urls import reverse
from django_webtest import WebTest, DjangoWebtestResponse

from gamedays.models import Team
from gamedays.service.team_repository_service import TeamRepositoryService
from league_manager.urls import LEAGUE_MANAGER_MAINTENANCE, CLEAR_CACHE
from league_manager.views import homeview, ClearCacheView, AllTeamListView
from officials.urls import OFFICIALS_LIST_FOR_ALL_TEAMS
from passcheck.urls import PASSCHECK_LIST_FOR_ALL_TEAMS


class TestMaintenanceView(WebTest):
    # @see base.py MAINTENANCE_PAGES
    def test_maintenance_page_is_delivered(self):
        expected_url = reverse(LEAGUE_MANAGER_MAINTENANCE)
        settings.MAINTENANCE_MODE = True

        for index, current_page in enumerate(settings.MAINTENANCE_PAGES):
            if "\\d+" in current_page:
                current_page_as_regex = current_page.replace("\\d+", str(index))
                current_page = current_page_as_regex[1:-1]
            response = self.client.get(current_page)
            assert response.url == expected_url

        settings.MAINTENANCE_MODE = False


class TestHomeView(TestCase):
    def test_homeview_renders_correct_template(self):
        response = self.client.get("/")  # or the URL name for homeview

        assert response.status_code == 200

        # Check that 'homeview.html' was used
        template_names = [t.name for t in response.templates if t.name is not None]
        assert "homeview.html" in template_names


class TestClearCacheView(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.staff_user = User.objects.create_user(
            username="staffuser", password="testpass", is_staff=True
        )
        self.url = reverse(CLEAR_CACHE)

    def test_clear_cache_requires_staff_permission(self):
        request = self.factory.get(self.url)
        request.user = self.user

        view = ClearCacheView()
        view.setup(request)

        assert not view.test_func()

    def test_clear_cache_allows_staff_users(self):
        request = self.factory.get(self.url)
        request.user = self.staff_user

        view = ClearCacheView()
        view.setup(request)

        assert view.test_func()

    def test_clear_cache_clears_cache_and_redirects_to_referer(self):
        # Set up cache with some data
        cache.set("test_key", "test_value", timeout=60)
        assert cache.get("test_key") == "test_value"

        # Use test client to send request with HTTP_REFERER
        self.client.force_login(self.staff_user)
        response = self.client.get(
            self.url, HTTP_REFERER="http://testserver/some-page/"
        )

        # Cache should be cleared
        assert cache.get("test_key") is None

        # Should redirect to referer
        assert response.status_code == 302
        assert response.url == "http://testserver/some-page/"

    def test_clear_cache_redirects_to_home_when_no_referer(self):
        request = self.factory.get(self.url)
        request.user = self.staff_user

        response = ClearCacheView.as_view()(request)

        assert response.status_code == 302
        assert response.url == "/"

    def test_clear_cache_redirects_to_home_when_referer_not_allowed(self):
        request = self.factory.get(self.url, HTTP_REFERER="http://malicious-site.com/")
        request.user = self.staff_user

        response = ClearCacheView.as_view()(request)

        assert response.status_code == 302
        assert response.url == "/"


class TestAllTeamListView(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.url_passcheck = reverse(PASSCHECK_LIST_FOR_ALL_TEAMS)
        self.url_officials = reverse(OFFICIALS_LIST_FOR_ALL_TEAMS)

    @patch(
        "gamedays.service.team_repository_service.TeamRepositoryService.get_all_teams"
    )
    def test_all_team_list_view_renders_correct_template(self, mock_get_all_teams):
        # Mock the team data
        mock_teams = [
            MagicMock(spec=Team, description="Team A"),
            MagicMock(spec=Team, description="Team B"),
        ]
        mock_get_all_teams.return_value = mock_teams

        # Use the test client to get the response
        response = self.client.get(self.url_passcheck)

        # Assertions
        assert response.status_code == 200
        # Check template names used
        template_names = [t.name for t in response.templates if t.name is not None]
        assert "team/all_teams_list.html" in template_names
        # Check context
        assert response.context["app"] == "passcheck"

    @patch(
        "gamedays.service.team_repository_service.TeamRepositoryService.get_all_teams"
    )
    def test_all_team_list_view_with_different_app_context(self, mock_get_all_teams):
        mock_teams = [MagicMock(spec=Team, description="Team A")]
        mock_get_all_teams.return_value = mock_teams

        # Use the test client
        response = self.client.get(self.url_officials)

        # Assertions
        assert response.status_code == 200
        # Template check
        template_names = [t.name for t in response.templates if t.name is not None]
        assert "team/all_teams_list.html" in template_names
        # Context check
        assert response.context["app"] == "officials"

    @patch(
        "gamedays.service.team_repository_service.TeamRepositoryService.get_all_teams"
    )
    def test_all_team_list_view_calls_service_method(self, mock_get_all_teams):
        mock_teams = [MagicMock(spec=Team, description="Team A")]
        mock_get_all_teams.return_value = mock_teams

        request = self.factory.get(self.url_passcheck)

        AllTeamListView.as_view()(request, app="passcheck")

        # Verify that the service method was called
        mock_get_all_teams.assert_called_once()
