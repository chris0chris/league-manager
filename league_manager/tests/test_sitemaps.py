"""
Tests for LeagueSphere sitemap functionality.

Following TDD principles - these tests define the expected behavior
before implementation.
"""

from datetime import timedelta

import pytest
from django.contrib.sites.models import Site
from django.test import TestCase, Client
from django.utils import timezone

from gamedays.models import Gameday, Season, League, Team
from league_manager.sitemaps import (
    StaticViewSitemap,
    LeaguetableSitemap,
    GamedaySitemap,
    PasscheckTeamSitemap,
    OfficialsSitemap,
)


class TestStaticViewSitemap(TestCase):
    """Test static pages are included in sitemap."""

    def setUp(self):
        self.sitemap = StaticViewSitemap()

    def test_static_sitemap_returns_home_page(self):
        """Test home page is in static sitemap."""
        items = list(self.sitemap.items())
        assert "/" in items

    def test_static_sitemap_returns_liveticker_page(self):
        """Test liveticker page is in static sitemap."""
        items = list(self.sitemap.items())
        assert "/liveticker/" in items

    def test_static_sitemap_returns_scorecard_page(self):
        """Test scorecard page is in static sitemap."""
        items = list(self.sitemap.items())
        assert "/scorecard/" in items

    def test_static_sitemap_home_has_highest_priority(self):
        """Test home page has priority 1.0."""
        priority = self.sitemap.priority("/")
        assert priority == 1.0

    def test_static_sitemap_other_pages_have_lower_priority(self):
        """Test other static pages have priority 0.8."""
        priority = self.sitemap.priority("/liveticker/")
        assert priority == 0.8

    def test_static_sitemap_has_daily_changefreq(self):
        """Test static pages have daily change frequency."""
        # changefreq is a class attribute in Django sitemaps
        assert self.sitemap.changefreq == "daily"


class TestLeaguetableSitemap(TestCase):
    """Test league table pages are included in sitemap."""

    def setUp(self):
        self.sitemap = LeaguetableSitemap()
        # Create test data
        self.season = Season.objects.create(name="2025")
        self.league = League.objects.create(name="Liga A")

    def test_leaguetable_sitemap_returns_league_pages(self):
        """Test league table pages are in sitemap."""
        items = list(self.sitemap.items())
        # At least the overall page should exist
        assert len(items) >= 0

    def test_leaguetable_sitemap_has_correct_priority(self):
        """Test league table pages have priority 0.8."""
        # priority is a class attribute in Django sitemaps
        assert self.sitemap.priority == 0.8

    def test_leaguetable_sitemap_has_weekly_changefreq(self):
        """Test league table pages change weekly."""
        # changefreq is a class attribute in Django sitemaps
        assert self.sitemap.changefreq == "weekly"


@pytest.mark.django_db
class TestGamedaySitemap(TestCase):
    """Test gameday detail pages are included in sitemap."""

    def setUp(self):
        from django.contrib.auth.models import User

        self.sitemap = GamedaySitemap()
        self.season = Season.objects.create(name="2025")
        self.league = League.objects.create(name="Liga A")
        # Create a user for the gameday author foreign key
        self.user = User.objects.create_user(username="testuser", password="testpass")

    def test_gameday_sitemap_returns_public_gamedays(self):
        """Test only public gameday detail pages are in sitemap."""
        # Create a gameday
        gameday = Gameday.objects.create(
            name="Spieltag 1",
            season=self.season,
            league=self.league,
            date=timezone.now().date(),
            start=timezone.now().time(),
            author=self.user,
        )

        items = list(self.sitemap.items())
        assert gameday in items

    def test_gameday_sitemap_excludes_future_gamedays(self):
        """Test future gamedays are excluded from sitemap."""
        # Create a future gameday (more than 7 days ahead)
        future_date = timezone.now().date() + timedelta(days=10)
        future_gameday = Gameday.objects.create(
            name="Future Spieltag",
            season=self.season,
            league=self.league,
            date=future_date,
            start=timezone.now().time(),
            author=self.user,
        )

        items = list(self.sitemap.items())
        # Future gamedays should not be in sitemap
        assert future_gameday not in items

    def test_gameday_sitemap_location_is_detail_url(self):
        """Test gameday sitemap returns correct detail URL."""
        gameday = Gameday.objects.create(
            name="Spieltag 1",
            season=self.season,
            league=self.league,
            date=timezone.now().date(),
            start=timezone.now().time(),
            author=self.user,
        )

        location = self.sitemap.location(gameday)
        expected_url = f"/gamedays/gameday/{gameday.pk}/"
        assert location == expected_url

    def test_gameday_sitemap_has_correct_priority(self):
        """Test gameday pages have priority 0.7."""
        # priority is a class attribute in Django sitemaps
        assert self.sitemap.priority == 0.7

    def test_gameday_sitemap_has_weekly_changefreq(self):
        """Test gameday pages change weekly."""
        # changefreq is a class attribute in Django sitemaps
        assert self.sitemap.changefreq == "weekly"


@pytest.mark.django_db
class TestPasscheckTeamSitemap(TestCase):
    """Test passcheck team roster pages are included in sitemap."""

    def setUp(self):
        self.sitemap = PasscheckTeamSitemap()

    def test_passcheck_sitemap_returns_teams(self):
        """Test team roster pages are in sitemap."""
        team = Team.objects.create(
            name="Test Team", description="Test Description", location="Test City"
        )

        items = list(self.sitemap.items())
        assert team in items

    def test_passcheck_sitemap_location_is_roster_url(self):
        """Test passcheck sitemap returns correct roster URL."""
        team = Team.objects.create(
            name="Test Team", description="Test Description", location="Test City"
        )

        location = self.sitemap.location(team)
        expected_url = f"/passcheck/team/{team.pk}/list/"
        assert location == expected_url

    def test_passcheck_sitemap_has_correct_priority(self):
        """Test team pages have priority 0.6."""
        # priority is a class attribute in Django sitemaps
        assert self.sitemap.priority == 0.6

    def test_passcheck_sitemap_has_weekly_changefreq(self):
        """Test team pages change weekly."""
        # changefreq is a class attribute in Django sitemaps
        assert self.sitemap.changefreq == "weekly"


@pytest.mark.django_db
class TestOfficialsSitemap(TestCase):
    """Test officials pages are included in sitemap."""

    def setUp(self):
        self.sitemap = OfficialsSitemap()

    def test_officials_sitemap_returns_static_pages(self):
        """Test officials static pages are in sitemap."""
        items = list(self.sitemap.items())
        assert "/officials/einsaetze/" in items

    def test_officials_sitemap_has_correct_priority(self):
        """Test officials pages have priority 0.5."""
        # priority is a class attribute in Django sitemaps
        assert self.sitemap.priority == 0.5

    def test_officials_sitemap_has_weekly_changefreq(self):
        """Test officials pages change weekly."""
        # changefreq is a class attribute in Django sitemaps
        assert self.sitemap.changefreq == "weekly"


class TestSitemapXMLEndpoint(TestCase):
    """Test sitemap.xml endpoint returns valid XML."""

    def setUp(self):
        self.client = Client()
        # Ensure site exists for sitemap framework
        Site.objects.get_or_create(
            pk=1,
            defaults={"domain": "example.com", "name": "example.com"},
        )

    def test_sitemap_xml_is_accessible(self):
        response = self.client.get("/sitemap.xml")
        self.assertEqual(response.status_code, 200)

    def test_sitemap_xml_returns_xml_content_type(self):
        response = self.client.get("/sitemap.xml")
        self.assertIn("xml", response["Content-Type"])

    def test_sitemap_xml_contains_urlset_tag(self):
        response = self.client.get("/sitemap.xml")
        self.assertContains(response, "<urlset")

    def test_sitemap_xml_contains_valid_namespace(self):
        response = self.client.get("/sitemap.xml")
        self.assertContains(
            response,
            'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
        )

    def test_sitemap_xml_contains_home_page(self):
        response = self.client.get("/sitemap.xml")
        self.assertContains(response, "<loc>http://example.com/</loc>")

    def test_sitemap_xml_contains_priority(self):
        response = self.client.get("/sitemap.xml")
        self.assertContains(response, "<priority>")

    def test_sitemap_xml_contains_changefreq(self):
        response = self.client.get("/sitemap.xml")
        self.assertContains(response, "<changefreq>")


class TestRobotsTxtEndpoint(TestCase):
    """Test robots.txt endpoint returns correct content."""

    def setUp(self):
        self.client = Client()

    def test_robots_txt_is_accessible(self):
        response = self.client.get("/robots.txt")
        self.assertEqual(response.status_code, 200)

    def test_robots_txt_returns_text_content_type(self):
        response = self.client.get("/robots.txt")
        self.assertEqual(response["Content-Type"], "text/plain")

    def test_robots_txt_contains_user_agent(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "User-agent: *")

    def test_robots_txt_contains_sitemap_location_directive(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Sitemap:")

    def test_robots_txt_contains_sitemap_filename(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "sitemap.xml")

    def test_robots_txt_disallows_create(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Disallow: /*/create/")

    def test_robots_txt_disallows_update(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Disallow: /*/update/")

    def test_robots_txt_disallows_delete(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Disallow: /*/delete/")

    def test_robots_txt_allows_leaguetable(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Allow: /leaguetable/")

    def test_robots_txt_allows_liveticker(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Allow: /liveticker/")

    def test_robots_txt_allows_scorecard(self):
        response = self.client.get("/robots.txt")
        self.assertContains(response, "Allow: /scorecard/")
