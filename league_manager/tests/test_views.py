from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, RequestFactory
from django.urls import reverse
from django_webtest import WebTest

from gamedays.constants import LEAGUE_GAMEDAY_LIST
from gamedays.models import Team
from league_manager.constants import (
    CLEAR_CACHE,
    LEAGUE_MANAGER_MAINTENANCE,
    MAINTENANCE_CONFIG_CACHE_KEY,
    MAINTENANCE_SCOPE_FULL,
    MAINTENANCE_SCOPE_OFF,
    MAINTENANCE_SCOPE_CUSTOM,
    MAINTENANCE_SCOPE_WRITES_ONLY,
)
from league_manager.models import SiteConfiguration
from league_manager.views import ClearCacheView, AllTeamListView
from officials.urls import OFFICIALS_LIST_FOR_ALL_TEAMS
from passcheck.urls import PASSCHECK_LIST_FOR_ALL_TEAMS


class TestMaintenanceScope(WebTest):
    def setUp(self):
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
        self.config, _ = SiteConfiguration.objects.get_or_create(id=1)

    def tearDown(self):
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    def _assert_redirect_to_maintenance(self, url, method="get"):
        client_method = getattr(self.client, method)
        response = client_method(url)
        self.assertEqual(response.status_code, 302)
        expected = reverse(LEAGUE_MANAGER_MAINTENANCE)
        self.assertIn(expected, response.url)

    def _assert_redirect_to_elsewhere(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)
        self.assertNotIn(expected_maint, response.url)

    def _assert_no_redirect(self, url):
        response = self.client.get(url)
        if response.status_code == 302:
            expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)
            self.assertNotIn(expected_maint, response.url)
        else:
            self.assertNotEqual(response.status_code, 302)

    def test_off_scope_allows_all_requests(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_OFF
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        response = self.client.get("/gamedays/gameday/new/")
        expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)
        if response.status_code == 302:
            self.assertNotIn(expected_maint, response.url)
        else:
            self.assertNotEqual(response.status_code, 302)

    def test_full_scope_redirects_all_urls(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_FULL
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        self._assert_redirect_to_maintenance("/gamedays/gameday/new/")
        self._assert_redirect_to_maintenance("/liveticker/")
        self._assert_redirect_to_maintenance("/any/random/path/")

    def test_full_scope_exempts_admin_and_maintenance(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_FULL
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)

        admin_response = self.client.get("/admin/")
        if admin_response.status_code == 302:
            self.assertNotIn(expected_maint, admin_response.url)

        maint_response = self.client.get("/maintenance/")
        self.assertEqual(maint_response.status_code, 200)

    def test_writes_only_scope_blocks_write_methods(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_WRITES_ONLY
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        post_response = self.client.post("/gamedays/gameday/new/")
        self.assertEqual(post_response.status_code, 302)
        expected = reverse(LEAGUE_MANAGER_MAINTENANCE)
        self.assertIn(expected, post_response.url)

    def test_writes_only_scope_allows_get_requests(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_WRITES_ONLY
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        response = self.client.get("/gamedays/gameday/new/")
        expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)
        if response.status_code == 302:
            self.assertNotIn(expected_maint, response.url)
        else:
            self.assertNotEqual(response.status_code, 302)

    def test_writes_only_scope_allows_admin_writes(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_WRITES_ONLY
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        response = self.client.post("/admin/login/")
        expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)
        if response.status_code == 302:
            self.assertNotIn(expected_maint, response.url)

    def test_custom_scope_redirects_matching_patterns(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_CUSTOM
        self.config.maintenance_pages = [
            "/gamedays/gameday/new/",
            r"^/passcheck/player/\d+/(update|delete|transfer)/$",
        ]
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        response = self.client.get("/gamedays/gameday/new/")
        self.assertEqual(response.status_code, 302)
        expected = reverse(LEAGUE_MANAGER_MAINTENANCE)
        self.assertIn(expected, response.url)

    def test_custom_scope_passes_through_non_matching(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_CUSTOM
        self.config.maintenance_pages = ["/gamedays/gameday/new/"]
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        response = self.client.get("/liveticker/")
        expected_maint = reverse(LEAGUE_MANAGER_MAINTENANCE)
        if response.status_code == 302:
            self.assertNotIn(expected_maint, response.url)

    def test_custom_scope_redirects_regex_matches(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_CUSTOM
        self.config.maintenance_pages = [r"^/gamedays/gameday/\d+/update$"]
        self.config.save()
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        response = self.client.get("/gamedays/gameday/42/update")
        self.assertEqual(response.status_code, 302)

    def test_maintenance_page_is_delivered(self):
        self.config.maintenance_scope = MAINTENANCE_SCOPE_CUSTOM
        maintenance_pages = [
            "/gamedays/gameday/new/",
            r"^/gamedays/gameday/\d+/update$",
            r"^/passcheck/player/\d+/(update|delete|transfer)/$",
        ]
        self.config.maintenance_pages = maintenance_pages
        self.config.save()

        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

        expected_url = reverse(LEAGUE_MANAGER_MAINTENANCE)

        for index, pattern in enumerate(maintenance_pages):
            target_url = pattern.replace(r"\d+", str(index + 100))
            target_url = target_url.replace(r"(update|delete|transfer)", "update")
            target_url = target_url.lstrip("^").rstrip("$")
            if not target_url.startswith("/"):
                target_url = "/" + target_url

            response = self.client.get(target_url)
            self.assertEqual(response.status_code, 302)
            self.assertIn(expected_url, response.url)


class TestMaintenanceConfigCacheTTL(TestCase):
    def setUp(self):
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)
        self.config, _ = SiteConfiguration.objects.get_or_create(id=1)

    def tearDown(self):
        cache.delete(MAINTENANCE_CONFIG_CACHE_KEY)

    def test_maintenance_config_cache_expires_within_a_minute(self):
        """A gunicorn deployment runs multiple worker processes, each with its
        own private LocMemCache. A stale entry only self-heals once it
        expires, so the TTL bounds how long an admin's maintenance_scope
        change can take to reach every worker. It must be short, not the
        69-day default that made propagation effectively unbounded."""
        with patch("league_manager.middleware.maintenance.cache.set") as mock_set:
            self.client.get("/health/")

        maintenance_calls = [
            call
            for call in mock_set.call_args_list
            if call.args[0] == MAINTENANCE_CONFIG_CACHE_KEY
        ]
        self.assertEqual(len(maintenance_calls), 1)
        timeout = maintenance_calls[0].args[2]
        self.assertLessEqual(timeout, 60)


class TestHomeView(TestCase):
    def test_homeview_renders_correct_template(self):
        response = self.client.get("/")  # or the URL name for homeview

        self.assertEqual(response.status_code, 301)

        expected_url = reverse(LEAGUE_GAMEDAY_LIST)
        self.assertEqual(response.url, expected_url)


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
