"""Navigation/permission UX for the officials self-service entry points.

The "Meine Einsätze" menu item used to leave the app for offd.de. It now
enters a small internal gate that sends anonymous visitors to the Moodle
login (with a safe ``next``) and logged-in officials to their own gamelist.
The canonical ``/einsaetze/meine/`` URL is the linkable form of the old
``?mine=1`` filter, and the self-service banner must always name the acting
person rather than the owner of the profile being viewed.
"""

from datetime import date, datetime
from http import HTTPStatus
from urllib.parse import quote

from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse

from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.menu import OfficialsMenu
from officials.tests.setup_factories.factories_officials import OfficialFactory

MY_ASSIGNMENTS_NAV = "view-officials-my-assignments-navigation"
MY_ASSIGNMENTS_MINE = "view-officials-game-officials-mine"
PROFILE_GAMELIST = "view-officials-profile-gamelist"
MOODLE_LOGIN = "view-officials-moodle-login"
ALL_ASSIGNMENTS = "view-officials-game-officials-appearance"
SEASON = datetime.today().year


def _login(client, official):
    session = client.session
    session[MOODLE_LOGGED_IN_USER] = official.pk
    session.save()
    return client


def _row(official, name):
    gameday = GamedayFactory(date=date(SEASON, 5, 1), name="Navigation Spieltag")
    gameinfo = GameinfoFactory(gameday=gameday)
    return GameOfficialFactory(
        gameinfo=gameinfo, official=official, name=name, position="Referee"
    )


class TestOfficialsMenu(TestCase):
    def test_my_assignments_item_is_internal_and_german(self):
        request = RequestFactory().get("/")
        request.user = AnonymousUser()

        items = OfficialsMenu().get_menu_items(request)

        labels = [item["name"] for item in items if "name" in item]
        assert "Meine Einsätze" in labels
        assert "Einsätze melden" not in labels
        item = next(item for item in items if item.get("name") == "Meine Einsätze")
        assert item["static"] is False
        assert item["url"] == reverse(MY_ASSIGNMENTS_NAV)
        assert "offd.de" not in item["url"]


class TestMyAssignmentsNavigation(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="Nav Team")
        self.official = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )
        self.url = reverse(MY_ASSIGNMENTS_NAV)

    def test_anonymous_redirects_to_moodle_login_with_next(self):
        response = Client().get(self.url)

        assert response.status_code == HTTPStatus.FOUND
        assert response.url.startswith(reverse(MOODLE_LOGIN) + "?")
        assert f"next={quote(self.url, safe='')}" in response.url

    def test_logged_in_official_redirects_to_own_gamelist(self):
        client = _login(Client(), self.official)

        response = client.get(self.url)

        assert response.status_code == HTTPStatus.FOUND
        assert response.url == reverse(
            PROFILE_GAMELIST,
            kwargs={"pk": self.official.pk, "season": SEASON},
        )


class TestCanonicalMineUrl(TestCase):
    def setUp(self):
        cache.clear()
        self.team = TeamFactory(name="Filter Team")
        self.acting = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.url = reverse(MY_ASSIGNMENTS_MINE)
        self.legacy_url = reverse(ALL_ASSIGNMENTS)

    def tearDown(self):
        cache.clear()

    def test_canonical_url_filters_to_acting_official(self):
        own = _row(self.acting, "Chris Kämpfe")
        foreign = _row(self.other, "Jemand Anders")
        client = _login(Client(), self.acting)

        response = client.get(self.url)

        assert response.status_code == HTTPStatus.OK
        content = response.content.decode()
        assert f'<th scope="row">{own.pk}</th>' in content
        assert f'<th scope="row">{foreign.pk}</th>' not in content
        assert response.context["mine_filter"] is True

    def test_legacy_query_parameter_still_filters(self):
        own = _row(self.acting, "Chris Kämpfe")
        foreign = _row(self.other, "Jemand Anders")
        client = _login(Client(), self.acting)

        response = client.get(self.legacy_url, {"mine": "1"})

        assert response.status_code == HTTPStatus.OK
        content = response.content.decode()
        assert f'<th scope="row">{own.pk}</th>' in content
        assert f'<th scope="row">{foreign.pk}</th>' not in content


class TestBannerOnForeignProfile(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="Banner Team")
        self.acting = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )
        self.owner = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.url = reverse(
            PROFILE_GAMELIST, kwargs={"pk": self.owner.pk, "season": SEASON}
        )

    def test_banner_names_acting_official_not_profile_owner(self):
        client = _login(Client(), self.acting)

        response = client.get(self.url)

        assert response.status_code == HTTPStatus.OK
        content = response.content.decode()
        assert "<strong>Chris Kämpfe</strong>" in content
        assert "<strong>Erika Musterfrau</strong>" not in content
