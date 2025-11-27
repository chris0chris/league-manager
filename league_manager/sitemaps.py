"""
LeagueSphere Sitemap Configuration.

This module defines sitemaps for search engine optimization (SEO).
Sitemaps help search engines discover and index public content.

Only read-only public pages are included. No write operations
(create, update, delete) are exposed in the sitemap.

SOLID Principles Applied:
- Single Responsibility: Each sitemap class handles one type of content
- Open/Closed: Easy to extend with new sitemap types without modifying existing
"""

from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from gamedays.models import Gameday, Season, League, Team


class StaticViewSitemap(Sitemap):
    """
    Sitemap for static read-only pages.

    Includes:
    - Home page (/)
    - Liveticker (/liveticker/)
    - Scorecard (/scorecard/)

    These pages change frequently during game days.
    """

    priority = 0.8
    changefreq = "daily"

    def items(self):
        """Return list of static page URLs."""
        return [
            "/",
            "/liveticker/",
            "/scorecard/",
        ]

    def location(self, item):
        """Return the URL for the item."""
        return item

    def priority(self, item):
        """Home page gets highest priority."""
        if item == "/":
            return 1.0
        return 0.8


class LeaguetableSitemap(Sitemap):
    """
    Sitemap for league standings pages.

    Includes league table pages for each season/league combination.
    Tables update weekly as games are played.
    """

    priority = 0.8
    changefreq = "weekly"

    def items(self):
        """Return list of league table page URLs."""
        urls = ["/leaguetable/"]  # Overall standings page

        # Add individual league standings pages
        seasons = Season.objects.all()
        leagues = League.objects.all()

        for season in seasons:
            for league in leagues:
                urls.append(f"/leaguetable/{season.name}/{league.name}/")

        return urls

    def location(self, item):
        """Return the URL for the item."""
        return item


class GamedaySitemap(Sitemap):
    """
    Sitemap for public gameday detail pages.

    Only includes past and current gamedays (not future events).
    Gameday pages are read-only public information about scheduled games.
    """

    priority = 0.7
    changefreq = "weekly"

    def items(self):
        """
        Return gamedays that should be in sitemap.

        Excludes future gamedays (more than 7 days ahead) to avoid
        indexing pages with incomplete information.
        """
        cutoff_date = timezone.now().date() + timedelta(days=7)
        return Gameday.objects.filter(date__lte=cutoff_date).order_by("-date")

    def location(self, obj):
        """Return the detail URL for the gameday."""
        return f"/gamedays/gameday/{obj.pk}/"

    def lastmod(self, obj):
        """Return last modification date based on gameday date."""
        return timezone.datetime.combine(
            obj.date,
            timezone.datetime.min.time(),
            tzinfo=timezone.get_current_timezone(),
        )


class PasscheckTeamSitemap(Sitemap):
    """
    Sitemap for team roster pages (passcheck).

    Team rosters are public read-only information about team composition.
    Updates occur weekly as players join or leave teams.
    """

    priority = 0.6
    changefreq = "weekly"

    def items(self):
        """Return all teams with roster pages."""
        return Team.objects.all().order_by("name")

    def location(self, obj):
        """Return the roster URL for the team."""
        return f"/passcheck/team/{obj.pk}/list/"


class OfficialsSitemap(Sitemap):
    """
    Sitemap for officials pages.

    Includes public read-only information about game officials.
    """

    priority = 0.5
    changefreq = "weekly"

    def items(self):
        """Return list of officials page URLs."""
        return [
            "/officials/einsaetze/",  # Officials game appearances
        ]

    def location(self, item):
        """Return the URL for the item."""
        return item
