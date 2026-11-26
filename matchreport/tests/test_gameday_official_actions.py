from datetime import date

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    GameresultFactory,
    TeamFactory,
)
from matchreport.constants import (
    MATCHREPORT_GAMEDAY_DETAIL,
    REPORT_TABLE_RENDER_CONFIG,
)
from matchreport.service.model_wrapper import MachtreportModelWrapper
from officials.tests.setup_factories.factories_officials import OfficialFactory

CLAIM_URL_NAME = "view-officials-selfservice-claim"
UNASSIGN_URL_NAME = "view-officials-selfservice-unassign"


class TestGamedayOfficialActionColumn(TestCase):
    def _gameday_with_game(self):
        gameday = GamedayFactory(date=date(2027, 5, 1))
        gameinfo = GameinfoFactory(
            gameday=gameday, stage="Hauptrunde", standing="Gruppe 1"
        )
        return gameday, gameinfo

    def _render_officials_table(self, gameday, gameinfo):
        wrapper = MachtreportModelWrapper(gameday.pk)
        return wrapper._get_game_officials_table(gameinfo.id).to_html(
            **REPORT_TABLE_RENDER_CONFIG
        )

    def test_assigned_official_row_has_claim_and_unassign_links(self):
        gameday, gameinfo = self._gameday_with_game()
        official = OfficialFactory(team=TeamFactory())
        game_official = GameOfficialFactory(
            gameinfo=gameinfo, official=official, position="Referee"
        )

        html = self._render_officials_table(gameday, gameinfo)

        claim_url = reverse(CLAIM_URL_NAME, kwargs={"pk": game_official.pk})
        unassign_url = reverse(UNASSIGN_URL_NAME, kwargs={"pk": game_official.pk})
        self.assertIn(claim_url, html)
        self.assertIn(unassign_url, html)
        self.assertIn("Zuordnen", html)
        self.assertIn("Zuordnung aufheben", html)
        self.assertIn('class="btn btn-sm btn-outline-primary"', html)
        self.assertIn('class="btn btn-sm btn-outline-danger"', html)

    def test_free_text_official_row_has_only_claim_link(self):
        gameday, gameinfo = self._gameday_with_game()
        game_official = GameOfficialFactory(
            gameinfo=gameinfo, official=None, name="Gast", position="Referee"
        )

        html = self._render_officials_table(gameday, gameinfo)

        self.assertIn(reverse(CLAIM_URL_NAME, kwargs={"pk": game_official.pk}), html)
        self.assertNotIn(
            reverse(UNASSIGN_URL_NAME, kwargs={"pk": game_official.pk}), html
        )
        self.assertNotIn("Zuordnung aufheben", html)

    def test_action_column_is_added_without_changing_other_columns_or_sorting(self):
        gameday, gameinfo = self._gameday_with_game()
        for position in [
            "Scorecard Judge",
            "Referee",
            "Side Judge",
            "Field Judge",
            "Down Judge",
        ]:
            GameOfficialFactory(
                gameinfo=gameinfo,
                official=OfficialFactory(team=TeamFactory()),
                position=position,
            )

        wrapper = MachtreportModelWrapper(gameday.pk)
        table = wrapper._get_game_officials_table(gameinfo.id)
        html = table.to_html(**REPORT_TABLE_RENDER_CONFIG)

        self.assertEqual(
            list(table.columns),
            ["Team", "Name", "Position", "Lizenz", "Lizenznummer", "Aktion"],
        )
        self.assertEqual(
            list(table["Position"]),
            [
                "Referee",
                "Down Judge",
                "Field Judge",
                "Side Judge",
                "Scorecard Judge",
            ],
        )
        for column in ("Team", "Name", "Position", "Lizenz", "Lizenznummer", "Aktion"):
            self.assertIn(f"<th>{column}</th>", html)


class TestGamedayOfficialActionsOnDetailPage(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_staff_sees_action_links_on_gameday_detail_page(self):
        gameday = GamedayFactory(date=date(2027, 5, 1))
        gameinfo = GameinfoFactory(gameday=gameday)
        GameresultFactory(
            gameinfo=gameinfo, team=TeamFactory(name="Home"), isHome=True, fh=0, sh=0
        )
        GameresultFactory(
            gameinfo=gameinfo, team=TeamFactory(name="Away"), isHome=False, fh=0, sh=0
        )
        assigned = GameOfficialFactory(
            gameinfo=gameinfo,
            official=OfficialFactory(team=TeamFactory()),
            position="Referee",
        )
        unassigned = GameOfficialFactory(
            gameinfo=gameinfo, official=None, name="Gast", position="Down Judge"
        )
        self.client.force_login(
            User.objects.create_user(username="staff", password="pw", is_staff=True)
        )

        response = self.client.get(
            reverse(MATCHREPORT_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk})
        )
        content = response.content.decode()

        self.assertEqual(response.status_code, 200)
        claim_assigned = reverse(CLAIM_URL_NAME, kwargs={"pk": assigned.pk})
        claim_unassigned = reverse(CLAIM_URL_NAME, kwargs={"pk": unassigned.pk})
        unassign_assigned = reverse(UNASSIGN_URL_NAME, kwargs={"pk": assigned.pk})
        unassign_unassigned = reverse(UNASSIGN_URL_NAME, kwargs={"pk": unassigned.pk})
        self.assertIn(claim_assigned, content)
        self.assertIn(claim_unassigned, content)
        self.assertIn(unassign_assigned, content)
        self.assertNotIn(unassign_unassigned, content)
        self.assertIn("Zuordnungen können hier direkt angepasst werden", content)
