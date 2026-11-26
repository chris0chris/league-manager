"""Canonical filter URLs for the Einsaetze list.

The two list filters used to be query-string-only (``?mine=1`` / ``?open=1``).
They now have linkable canonical routes - ``/einsaetze/meine/`` (already
existing) and ``/einsaetze/offen/`` (new) - which the filter buttons use. The
old query parameters remain supported for existing links and bookmarks, and
both filters still compose in query-param form.
"""

import re
from datetime import date, datetime
from html import unescape
from http import HTTPStatus

from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import resolve, reverse

import officials.urls as officials_urls
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.views import GameOfficialListView
from officials.tests.setup_factories.factories_officials import OfficialFactory

ALL_URL_NAME = "view-officials-game-officials-appearance"
MINE_URL_NAME = "view-officials-game-officials-mine"
OPEN_URL_NAME = "view-officials-game-officials-open"
SEASON = datetime.today().year
MINE_LABEL = "Nur meine Einträge"
OPEN_LABEL = "Nur ? Einträge"
SHOW_ALL_LABEL = "Alle Einträge zeigen"


def _login(client, official):
    session = client.session
    session[MOODLE_LOGGED_IN_USER] = official.pk
    session.save()
    return client


def _row(official, name):
    gameday = GamedayFactory(date=date(SEASON, 5, 1), name="Filter URL Spieltag")
    gameinfo = GameinfoFactory(gameday=gameday)
    return GameOfficialFactory(
        gameinfo=gameinfo, official=official, name=name, position="Referee"
    )


def _filter_link(content, label):
    """The ``(href, classes)`` of the button whose visible text is ``label``."""
    match = re.search(r"<a\b([^>]*)>\s*" + re.escape(label) + r"\s*</a>", content, re.S)
    assert match, f"no button labelled {label!r} in page"
    attrs = match.group(1)
    href = re.search(r'href="([^"]*)"', attrs)
    classes = re.search(r'class="([^"]*)"', attrs)
    assert href and classes, attrs
    return unescape(href.group(1)), classes.group(1)


class TestCanonicalFilterRoutes(TestCase):
    def test_open_route_reverses_to_canonical_path(self):
        assert reverse(OPEN_URL_NAME) == "/officials/einsaetze/offen/"

    def test_open_route_resolves_with_open_kwarg(self):
        match = resolve("/officials/einsaetze/offen/")

        assert match.func.view_class is GameOfficialListView
        assert match.kwargs == {"open": True}

    def test_open_route_name_constant_exists(self):
        assert officials_urls.OFFICIALS_GAME_OFFICIALS_OPEN == OPEN_URL_NAME

    def test_mine_route_still_resolves_with_mine_kwarg(self):
        assert reverse(MINE_URL_NAME) == "/officials/einsaetze/meine/"
        assert resolve("/officials/einsaetze/meine/").kwargs == {"mine": True}

    def test_unfiltered_route_has_no_filter_kwargs(self):
        assert reverse(ALL_URL_NAME) == "/officials/einsaetze/"
        assert resolve("/officials/einsaetze/").kwargs == {}


class TestCanonicalFilterBehaviour(TestCase):
    def setUp(self):
        cache.clear()
        self.team = TeamFactory(name="Filter URLs Team")
        self.acting = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.own_mapped = _row(self.acting, "Chris Kämpfe")
        self.foreign_mapped = _row(self.other, "Erika Musterfrau")
        self.open_own = _row(None, "Chris Kämpfe")
        self.open_foreign = _row(None, "Unbekannte Person")
        self.client = _login(Client(), self.acting)
        self.all_url = reverse(ALL_URL_NAME)
        self.mine_url = reverse(MINE_URL_NAME)
        self.open_url = reverse(OPEN_URL_NAME)

    def tearDown(self):
        cache.clear()

    @staticmethod
    def _row_ids(response):
        return {
            int(row["id"]) for row in response.context["object_list"] if row.get("id")
        }

    def test_canonical_open_url_shows_only_unmapped_rows(self):
        response = self.client.get(self.open_url)

        assert response.status_code == HTTPStatus.OK
        assert response.context["open_filter"] is True
        assert response.context["mine_filter"] is False
        assert self._row_ids(response) == {self.open_own.pk, self.open_foreign.pk}

    def test_canonical_mine_url_shows_only_own_and_matching_open_rows(self):
        response = self.client.get(self.mine_url)

        assert response.status_code == HTTPStatus.OK
        assert response.context["mine_filter"] is True
        assert self._row_ids(response) == {self.own_mapped.pk, self.open_own.pk}

    def test_canonical_open_with_legacy_mine_param_composes(self):
        response = self.client.get(self.open_url, {"mine": "1"})

        assert response.context["mine_filter"] is True
        assert response.context["open_filter"] is True
        assert self._row_ids(response) == {self.open_own.pk}

    def test_canonical_mine_with_legacy_open_param_composes(self):
        response = self.client.get(self.mine_url, {"open": "1"})

        assert response.context["mine_filter"] is True
        assert response.context["open_filter"] is True
        assert self._row_ids(response) == {self.open_own.pk}

    def test_legacy_open_param_still_filters(self):
        response = self.client.get(self.all_url, {"open": "1"})

        assert response.context["open_filter"] is True
        assert self._row_ids(response) == {self.open_own.pk, self.open_foreign.pk}

    def test_legacy_mine_param_still_filters(self):
        response = self.client.get(self.all_url, {"mine": "1"})

        assert response.context["mine_filter"] is True
        assert self._row_ids(response) == {self.own_mapped.pk, self.open_own.pk}

    def test_both_legacy_params_compose(self):
        response = self.client.get(self.all_url, {"mine": "1", "open": "1"})

        assert response.context["mine_filter"] is True
        assert response.context["open_filter"] is True
        assert self._row_ids(response) == {self.open_own.pk}


class TestCanonicalFilterButtons(TestCase):
    def setUp(self):
        cache.clear()
        self.team = TeamFactory(name="Filter Buttons Team")
        self.acting = OfficialFactory(
            first_name="Chris", last_name="Kämpfe", team=self.team
        )
        self.client = _login(Client(), self.acting)
        self.all_url = reverse(ALL_URL_NAME)
        self.mine_url = reverse(MINE_URL_NAME)
        self.open_url = reverse(OPEN_URL_NAME)

    def tearDown(self):
        cache.clear()

    def _content(self, url, params=None):
        response = self.client.get(url, params or {})
        assert response.status_code == HTTPStatus.OK
        return response.content.decode()

    def test_inactive_buttons_link_to_canonical_routes(self):
        content = self._content(self.all_url)

        mine_href, mine_classes = _filter_link(content, MINE_LABEL)
        open_href, open_classes = _filter_link(content, OPEN_LABEL)

        assert mine_href == self.mine_url
        assert open_href == self.open_url
        assert mine_classes == "btn btn-sm btn-outline-secondary"
        assert open_classes == "btn btn-sm btn-outline-secondary"

    def test_active_mine_button_is_primary_and_returns_to_unfiltered_list(self):
        content = self._content(self.mine_url)

        href, classes = _filter_link(content, SHOW_ALL_LABEL)
        assert classes == "btn btn-sm btn-primary"
        assert href == self.all_url

        restored = self.client.get(href)
        assert restored.context["mine_filter"] is False
        assert restored.context["open_filter"] is False

    def test_active_open_button_is_primary_and_returns_to_unfiltered_list(self):
        content = self._content(self.open_url)

        href, classes = _filter_link(content, OPEN_LABEL)
        assert classes == "btn btn-sm btn-primary"
        assert href == self.all_url

        restored = self.client.get(href)
        assert restored.context["open_filter"] is False

    def test_both_filters_active_via_query_params_show_primary_buttons(self):
        content = self._content(self.all_url, {"mine": "1", "open": "1"})

        _, mine_classes = _filter_link(content, SHOW_ALL_LABEL)
        _, open_classes = _filter_link(content, OPEN_LABEL)

        assert mine_classes == "btn btn-sm btn-primary"
        assert open_classes == "btn btn-sm btn-primary"

    def test_german_button_labels_are_present(self):
        content = self._content(self.all_url)

        assert MINE_LABEL in content
        assert OPEN_LABEL in content
