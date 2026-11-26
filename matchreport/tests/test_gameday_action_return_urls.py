"""Return-to-referrer behaviour for the claim/unassign links on a gameday report.

The "Zuordnen" / "Zuordnung aufheben" buttons on /matchreport/gameday/<pk>/
must carry the gameday detail page as ``?next=`` and the confirm pages must
honour it for both the write and the "Abbrechen" link.
"""

from datetime import date

import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse
from django.utils.http import urlencode

from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.selfservice import safe_next
from officials.tests.setup_factories.factories_officials import OfficialFactory
from matchreport.service.model_wrapper import MachtreportModelWrapper

CLAIM_URL_NAME = "view-officials-selfservice-claim"
UNASSIGN_URL_NAME = "view-officials-selfservice-unassign"
DFFL_DELETE_URL_NAME = "view-officials-selfservice-dffl-delete"
GAMEDAY_DETAIL_URL_NAME = "matchreport-gameday-detail"


def _gameday_path(pk):
    return reverse(GAMEDAY_DETAIL_URL_NAME, kwargs={"pk": pk})


class TestGamedayActionLinks(TestCase):
    def test_claim_and_unassign_links_carry_encoded_gameday_next(self):
        gameday = GamedayFactory(pk=632, date=date(2026, 5, 1))
        gameinfo = GameinfoFactory(gameday=gameday)
        GameOfficialFactory(
            gameinfo=gameinfo,
            official=OfficialFactory(team=TeamFactory()),
            position="Referee",
        )

        table = MachtreportModelWrapper(gameday.pk)._get_game_officials_table(
            gameinfo.pk
        )
        actions = table["Aktion"].iloc[0]

        expected = urlencode({"next": _gameday_path(632)})
        assert expected == "next=%2Fmatchreport%2Fgameday%2F632%2F"
        assert actions.count(f"?{expected}") == 2

    def test_unknown_name_escape_does_not_break_return_url(self):
        gameday = GamedayFactory(pk=632, date=date(2026, 5, 1))
        gameinfo = GameinfoFactory(gameday=gameday)
        GameOfficialFactory(
            gameinfo=gameinfo, official=None, name="<script>", position="Referee"
        )

        table = MachtreportModelWrapper(gameday.pk)._get_game_officials_table(
            gameinfo.pk
        )
        actions = table["Aktion"].iloc[0]

        assert "next=%2Fmatchreport%2Fgameday%2F632%2F" in actions


class TestSafeNextAllowsMatchreport:
    @pytest.mark.parametrize(
        "target",
        [
            "/matchreport/gameday/632/",
            "/officials/einsaetze/",
        ],
    )
    def test_internal_target_is_kept(self, target):
        request = RequestFactory().get("/officials/einsaetze/", {"next": target})
        request.user = AnonymousUser()

        assert safe_next(request) == target

    @pytest.mark.parametrize(
        "target",
        [
            "https://evil.example.com/matchreport/gameday/632/",
            "http://127.0.0.1:8000/matchreport/gameday/632/",
            "//evil.example.com/matchreport/gameday/632/",
            "/admin/",
            "",
        ],
    )
    def test_external_or_foreign_target_falls_back(self, target):
        request = RequestFactory().get("/officials/einsaetze/", {"next": target})
        request.user = AnonymousUser()

        assert safe_next(request) == reverse("view-officials-sign-up-list")


class TestConfirmCancelHonoursNext(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="Return Team")
        self.official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=self.team
        )
        self.gameday = GamedayFactory(pk=632, date=date(2026, 5, 1))
        self.gameinfo = GameinfoFactory(gameday=self.gameday)
        self.next_url = _gameday_path(self.gameday.pk)
        self.client = Client()
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = self.official.pk
        session.save()

    def test_claim_confirm_cancel_links_back_to_gameday(self):
        row = GameOfficialFactory(gameinfo=self.gameinfo, official=None)

        response = self.client.get(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), {"next": self.next_url}
        )

        assert response.status_code == 200
        content = response.content.decode()
        assert f'href="{self.next_url}"' in content
        assert "Abbrechen" in content

    def test_claim_confirm_cancel_without_next_keeps_einsaetze_default(self):
        row = GameOfficialFactory(gameinfo=self.gameinfo, official=None)

        content = self.client.get(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk})
        ).content.decode()

        assert (
            f'href="{reverse("view-officials-game-officials-appearance")}"' in content
        )

    def test_staff_unassign_write_returns_to_gameday(self):
        # unassign_confirm.html already posts next as a hidden field; allowing
        # /matchreport/ in safe_next() is what makes that write return here.
        row = GameOfficialFactory(
            gameinfo=self.gameinfo,
            official=self.official,
            name="Max Mustermann",
        )
        staff = Client()
        staff.force_login(DBSetup().create_new_user("staff", is_staff=True))

        response = staff.post(
            reverse(UNASSIGN_URL_NAME, kwargs={"pk": row.pk}),
            {"next": self.next_url},
        )

        assert response.status_code == 302
        assert response.url == self.next_url
        row.refresh_from_db()
        assert row.official_id is None

    def test_dffl_delete_confirm_cancel_and_write_return_to_gameday(self):
        row = GameOfficialFactory(gameinfo=self.gameinfo, official=self.official)
        url = reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk})

        content = self.client.get(url, {"next": self.next_url}).content.decode()
        assert f'href="{self.next_url}"' in content

        response = self.client.post(url, {"next": self.next_url})
        assert response.status_code == 302
        assert response.url == self.next_url
        row.refresh_from_db()
        assert row.official_id is None
