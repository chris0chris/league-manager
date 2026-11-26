"""User-request regression tests for the Einsaetze list.

- A Django staff session wins over a Moodle login in the self-service banner;
  staff must never be offered the Moodle "Abmelden" link.
- The "Nur ? Eintraege" toggle narrows the list to unmapped rows and composes
  with the existing "mine" filter.
- The officials list points the "nachmelden" hint at the internal
  "Meine Einsaetze" route instead of leaving the app for offd.de.
"""

import re
from datetime import date, datetime
from html import unescape
from http import HTTPStatus

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse

from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.tests.setup_factories.factories_officials import OfficialFactory

LIST_URL = reverse("view-officials-game-officials-appearance")
SEASON = datetime.today().year
OPEN_TOGGLE_LABEL = "Nur ? Einträge"


def _moodle_login(client, official):
    session = client.session
    session[MOODLE_LOGGED_IN_USER] = official.pk
    session.save()
    return client


def _row(official, name):
    gameday = GamedayFactory(date=date(SEASON, 5, 1), name="Filter Spieltag")
    gameinfo = GameinfoFactory(gameday=gameday)
    return GameOfficialFactory(
        gameinfo=gameinfo, official=official, name=name, position="Referee"
    )


def _toggle_href(content, label=OPEN_TOGGLE_LABEL):
    """The href of the button whose text is ``label`` (strip HTML entities)."""
    match = re.search(
        r'<a[^>]*href="([^"]*)"[^>]*>\s*' + re.escape(label) + r"\s*</a>",
        content,
    )
    assert match, f"no toggle link labelled {label!r} in page"
    return unescape(match.group(1))


class BannerStaffWinsTest(TestCase):
    def setUp(self):
        cache.clear()
        self.team = TeamFactory(name="Banner Team")
        self.official = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )

    def tearDown(self):
        cache.clear()

    def test_moodle_official_without_staff_sees_abmelden(self):
        client = _moodle_login(Client(), self.official)

        content = client.get(LIST_URL).content.decode()

        assert ">Abmelden<" in content
        assert "Angemeldet als" in content

    def test_staff_with_moodle_session_does_not_see_abmelden(self):
        staff = User.objects.create_user(
            username="turnierleitung", password="secret", is_staff=True
        )
        client = Client()
        client.force_login(staff)
        _moodle_login(client, self.official)

        content = client.get(LIST_URL).content.decode()

        assert "Angemeldet als" in content
        assert "<strong>turnierleitung</strong>" in content
        assert ">Abmelden<" not in content


class OpenFilterTest(TestCase):
    def setUp(self):
        cache.clear()
        self.team = TeamFactory(name="Open Filter Team")
        self.acting = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.own_mapped = _row(self.acting, "Chris Kämpfe")
        self.foreign_mapped = _row(self.other, "Erika Musterfrau")
        self.open_row = _row(None, "Chris Kämpfe")
        self.client = _moodle_login(Client(), self.acting)

    def tearDown(self):
        cache.clear()

    def _page(self, params=None):
        return self.client.get(LIST_URL, params or {})

    @staticmethod
    def _row_ids(response):
        return {
            int(row["id"]) for row in response.context["object_list"] if row.get("id")
        }

    def test_open_filter_shows_only_unmapped_rows(self):
        response = self._page({"open": "1"})

        assert response.status_code == HTTPStatus.OK
        assert response.context["open_filter"] is True
        assert self._row_ids(response) == {self.open_row.pk}

    def test_without_open_filter_shows_mapped_and_unmapped_rows(self):
        response = self._page()

        assert response.context["open_filter"] is False
        assert self._row_ids(response) == {
            self.own_mapped.pk,
            self.foreign_mapped.pk,
            self.open_row.pk,
        }

    def test_open_and_mine_together_show_only_unmapped_rows(self):
        response = self._page({"mine": "1", "open": "1"})

        assert response.context["mine_filter"] is True
        assert response.context["open_filter"] is True
        assert self._row_ids(response) == {self.open_row.pk}
        assert all(
            not row.get("official_id") for row in response.context["object_list"]
        )

    def test_open_toggle_activates_and_restores_the_normal_list(self):
        normal = self._page().content.decode()
        activate = _toggle_href(normal)
        assert activate == "/officials/einsaetze/offen/"

        active_response = self.client.get(activate)
        active = active_response.content.decode()
        assert self._row_ids(active_response) == {self.open_row.pk}
        restore = _toggle_href(active)
        assert restore == "/officials/einsaetze/"

        restored = self.client.get(restore)
        assert restored.context["open_filter"] is False
        assert self._row_ids(restored) == {
            self.own_mapped.pk,
            self.foreign_mapped.pk,
            self.open_row.pk,
        }

    def test_active_toggle_uses_primary_button_style(self):
        content = self._page({"open": "1"}).content.decode()

        assert 'class="btn btn-sm btn-primary"' in content
        assert re.search(
            r'class="btn btn-sm btn-primary"[^>]*>\s*' + re.escape(OPEN_TOGGLE_LABEL),
            content,
        ), content

    def test_anonymous_visitor_is_not_offered_the_toggle(self):
        anonymous = Client()

        content = anonymous.get(LIST_URL).content.decode()

        assert OPEN_TOGGLE_LABEL not in content


class OfficialsListInternalLinkTest(TestCase):
    def test_nachmelden_hint_links_to_internal_route(self):
        team = TeamFactory(name="Link Team")
        url = reverse("view-officials-list-for-team", kwargs={"pk": team.pk})

        response = Client().get(url)

        assert response.status_code == HTTPStatus.OK
        content = response.content.decode()
        expected = (
            f'<a href="{reverse("view-officials-my-assignments-navigation")}">'
            "Meine Einsätze</a>"
        )
        assert f"über {expected} nachmelden" in content
        assert "view.php?id=315" not in content
        assert "offd.de" not in content
