import json
import pathlib
from collections import OrderedDict
from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch

import pytest
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer
from gamedays.constants import API_GAMEDAY_WHISTLEGAMES, API_GAMEDAY_LIST, API_GAME_OFFICIALS
from gamedays.models import Team, Gameday, Gameinfo
from gamedays.service.auto_assign_officials_service import AutoAssignOfficialsError
from gamedays.service.gameday_service import EmptySchedule, EmptyQualifyTable
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_table.tests.setup_factories.db_setup_leaguetable import LEAGUE_TABLE_TEST_RULESET
from league_table.tests.setup_factories.factories_leaguetable import LeagueSeasonConfigFactory


class TestGamedayAPIViews(WebTest):

    @pytest.mark.xfail
    def test_gameday_list(self):
        for i in range(3):
            DBSetup().create_empty_gameday()
        # YYYY-MM-DD
        today = datetime.today().strftime("%Y-%m-%d")
        Gameday.objects.filter(id__lt=3).update(date=today)
        response = self.app.get(reverse(API_GAMEDAY_LIST))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2


class TestGamedayRetrieveUpdate(WebTest):

    def test_api_retrieve_gameday(self):
        gameday = DBSetup().g62_status_empty()
        response = self.app.get(
            reverse("api-gameday-retrieve-update", kwargs={"pk": gameday.pk})
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == GamedaySerializer(gameday).data


class TestGameinfoRetrieveUpdate(WebTest):

    def test_api_retrieve_gameinfo(self):
        gameday = DBSetup().g62_qualify_finished()
        gameinfo = Gameinfo.objects.filter(gameday=gameday).first()
        response = self.app.get(
            reverse("api-gameinfo-retrieve-update", kwargs={"pk": gameinfo.pk})
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == GameinfoSerializer(gameinfo).data

    def test_update_gameinfo(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        assert gameinfo.status == "Geplant"
        assert gameinfo.gameStarted is None
        assert gameinfo.gameHalftime is None
        assert gameinfo.gameFinished is None
        response = self.app.patch_json(
            reverse("api-gameinfo-retrieve-update", kwargs={"pk": gameinfo.pk}),
            {
                "status": "gestartet",
                "gameStarted": "20:09",
                "gameHalftime": "20:29",
                "gameFinished": "09:00",
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK

        gameinfo = Gameinfo.objects.get(id=gameinfo.pk)
        assert gameinfo.status == "gestartet"
        assert str(gameinfo.gameStarted) == "20:09:00"
        assert str(gameinfo.gameHalftime) == "20:29:00"
        assert str(gameinfo.gameFinished) == "09:00:00"


class TestGamedaySchedule(WebTest):

    def test_get_empty_schedule(self):
        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": 1}) + "?get=schedule"
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == json.loads(
            EmptySchedule().to_json(), object_pairs_hook=OrderedDict
        )

    def test_get_schedule_for_played_gameday_returns_canonical_keys(self):
        """
        Regression test for #1781: previously /api/gameday/<id>/details?get=schedule
        500'd with "DataFrame columns must be unique for orient='index'" for any
        gameday with played games, because the API serialized the display-renamed
        schedule (POINTS_HOME and POINTS_AWAY both renamed to "Pkt").

        The JSON payload must expose stable canonical keys, not German display
        headers, and must not have duplicate keys.
        """
        gameday = DBSetup().g62_qualify_finished()
        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": gameday.pk}) + "?get=schedule"
        )
        assert response.status_code == HTTPStatus.OK
        payload = response.json
        # default orient="index" serializes as {row_index: {...}} for a populated
        # schedule (the empty case returns "[]").
        assert payload, "expected a populated schedule for a played gameday"
        rows = payload.values() if isinstance(payload, dict) else payload

        canonical_keys = ["gameinfo", "home", "points_home", "points_away", "away"]
        for row in rows:
            assert isinstance(row, dict)
            for key in canonical_keys:
                assert key in row
            assert "Pkt" not in row
            assert len(row) == len(set(row)), "JSON object has duplicate keys"

    @patch("league_table.service.datatypes.LeagueConfigRuleset.from_ruleset")
    def test_get_qualify_table(self, mock_get_league_config_ruleset):
        mock_get_league_config_ruleset.return_value = LEAGUE_TABLE_TEST_RULESET
        gameday = DBSetup().g62_qualify_finished()
        LeagueSeasonConfigFactory(league=gameday.league, season=gameday.season)
        with open(
            pathlib.Path(__file__).parent / "testdata/qualify_g62_qualify_finished.json"
        ) as f:
            expected_qualify = json.load(f)
        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": gameday.pk}) + "?get=qualify"
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == expected_qualify

    def test_get_empty_qualify_table(self):
        gameday = DBSetup().create_empty_gameday()
        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": gameday.pk}) + "?get=qualify"
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == json.loads(
            EmptyQualifyTable().to_json(), object_pairs_hook=OrderedDict
        )

    @patch("league_table.service.datatypes.LeagueConfigRuleset.from_ruleset")
    def test_get_final_table(self, mock_get_league_config_ruleset):
        mock_get_league_config_ruleset.return_value = LEAGUE_TABLE_TEST_RULESET
        gameday = DBSetup().g62_finished()
        LeagueSeasonConfigFactory(league=gameday.league, season=gameday.season)
        with open(
            pathlib.Path(__file__).parent / "testdata/final_g62_finished.json"
        ) as f:
            expected_qualify = json.load(f)
        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": gameday.pk}) + "?get=final"
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == expected_qualify

    def test_get_empty_final_table(self):
        gameday = DBSetup().g62_qualify_finished()
        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": gameday.pk}) + "?get=final"
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json == []

    @patch("league_table.service.datatypes.LeagueConfigRuleset.from_ruleset")
    def test_gameday_details_qualify_table_for_designer_stage_name_returns_200(
        self, mock_get_league_config_ruleset
    ):
        """
        Regression test for the prod incident where /api/gameday/<id>/details?get=qualify
        500'd with KeyError: "['win_points'] not in index" for any gameday
        whose stage name wasn't literally "Vorrunde" or "Hauptrunde" (e.g.
        Designer-published gamedays named "Liga").
        """
        mock_get_league_config_ruleset.return_value = LEAGUE_TABLE_TEST_RULESET
        gameday = DBSetup().create_empty_gameday()
        LeagueSeasonConfigFactory(league=gameday.league, season=gameday.season)
        DBSetup().create_group(
            gameday=gameday,
            name="A",
            stage="Liga",
            standing="Tabelle",
            status="beendet",
            number_teams=3,
        )

        response = self.app.get(
            reverse("api-gameday-schedule", kwargs={"pk": gameday.pk}) + "?get=qualify"
        )

        assert response.status_code == HTTPStatus.OK


class TestGamesToWhistleAPIView(WebTest):
    def test_get_games_to_whistle_for_specific_team(self):
        gameday = DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        first_team = Team.objects.first()
        # first game is done and isn't counted
        Gameinfo.objects.filter(id=first_game.pk).update(gameFinished="13:00")
        # second game is officiated be a different team and isn't counted
        Gameinfo.objects.filter(id=first_game.pk + 1).update(
            officials=first_team.pk + 1
        )
        response = self.app.get(
            reverse(
                API_GAMEDAY_WHISTLEGAMES, kwargs={"pk": gameday.pk, "team": "officials"}
            ),
            headers=DBSetup().get_token_header(),
        )
        assert len(response.json) == 4

    def test_get_all_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        first_team = Team.objects.first()
        Gameinfo.objects.filter(id=first_game.pk).update(gameFinished="13:00")
        Gameinfo.objects.filter(id=first_game.pk + 1).update(
            officials=first_team.pk + 1
        )
        response = self.app.get(
            reverse(API_GAMEDAY_WHISTLEGAMES, kwargs={"pk": gameday.pk, "team": "*"})
        )
        assert len(response.json) == 10


class TestStandaloneViewPermissions(WebTest):
    """Permission tests for legacy standalone API views:
    - Reads: AllowAny (public)
    - Writes: IsAuthenticated + (user.is_staff OR user is the author)
    """

    def _create_gameday_with_author(self, username, is_staff=False):
        """Create a gameday with a specific user as author and return (user, gameday)."""
        from django.contrib.auth.models import User

        user = User.objects.create_user(
            username=username, password="password", is_staff=is_staff
        )
        gameday = DBSetup().create_empty_gameday()
        gameday.author = user
        gameday.save()
        return user, gameday

    # ── GamedayPublishAPIView (legacy: POST /api/gameday/{id}/publish/) ──

    def test_anonymous_cannot_publish_via_legacy_endpoint(self):
        _, gameday = self._create_gameday_with_author("pub_author")
        response = self.app.post(
            reverse("api-gameday-publish", kwargs={"pk": gameday.pk}),
            expect_errors=True,
        )
        assert response.status_code in (401, 403)

    def test_non_staff_non_author_cannot_publish_via_legacy_endpoint(self):
        author, gameday = self._create_gameday_with_author("pub_author2")
        other_user = DBSetup().create_new_user("pub_non_author")
        response = self.app.post(
            reverse("api-gameday-publish", kwargs={"pk": gameday.pk}),
            headers=DBSetup().get_token_header(user=other_user),
            expect_errors=True,
        )
        assert response.status_code == 403

    def test_author_can_publish_via_legacy_endpoint(self):
        author, gameday = self._create_gameday_with_author("pub_author3")
        response = self.app.post(
            reverse("api-gameday-publish", kwargs={"pk": gameday.pk}),
            headers=DBSetup().get_token_header(user=author),
        )
        assert response.status_code == 200
        gameday.refresh_from_db()
        assert gameday.status == "PUBLISHED"

    def test_staff_can_publish_via_legacy_endpoint(self):
        author, gameday = self._create_gameday_with_author("pub_author4")
        staff_user = DBSetup().create_new_user("pub_staff", is_staff=True)
        response = self.app.post(
            reverse("api-gameday-publish", kwargs={"pk": gameday.pk}),
            headers=DBSetup().get_token_header(user=staff_user),
        )
        assert response.status_code == 200
        gameday.refresh_from_db()
        assert gameday.status == "PUBLISHED"

    # ── GameinfoUpdateAPIView (PATCH /api/gameinfo/{id}/) ──

    def test_anonymous_cannot_update_gameinfo(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        response = self.app.patch_json(
            reverse("api-gameinfo-retrieve-update", kwargs={"pk": gameinfo.pk}),
            {"status": "gestartet"},
            expect_errors=True,
        )
        assert response.status_code in (401, 403)

    def test_non_staff_non_author_cannot_update_gameinfo(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        other_user = DBSetup().create_new_user("gi_non_author")
        response = self.app.patch_json(
            reverse("api-gameinfo-retrieve-update", kwargs={"pk": gameinfo.pk}),
            {"status": "gestartet"},
            headers=DBSetup().get_token_header(user=other_user),
            expect_errors=True,
        )
        assert response.status_code == 403

    def test_author_can_update_gameinfo_for_own_gameday(self):
        gameday = DBSetup().g62_status_empty()
        gameday.author = DBSetup().create_new_user("gi_author")
        gameday.save()
        gameinfo = Gameinfo.objects.first()
        response = self.app.patch_json(
            reverse("api-gameinfo-retrieve-update", kwargs={"pk": gameinfo.pk}),
            {"status": "gestartet"},
            headers=DBSetup().get_token_header(user=gameday.author),
        )
        assert response.status_code == 200

    def test_staff_can_update_gameinfo(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        staff_user = DBSetup().create_new_user("gi_staff", is_staff=True)
        response = self.app.patch_json(
            reverse("api-gameinfo-retrieve-update", kwargs={"pk": gameinfo.pk}),
            {"status": "gestartet"},
            headers=DBSetup().get_token_header(user=staff_user),
        )
        assert response.status_code == 200

    # ── GamedayRetrieveUpdate (PUT /api/gameday/{id}/) ──

    def test_anonymous_cannot_update_gameday_retrieve_update(self):
        author, gameday = self._create_gameday_with_author("ru_author")
        response = self.app.put_json(
            reverse("api-gameday-retrieve-update", kwargs={"pk": gameday.pk}),
            {
                "name": "Hacked", "date": str(gameday.date), "start": gameday.start,
                "season": gameday.season_id, "league": gameday.league_id,
            },
            expect_errors=True,
        )
        assert response.status_code in (401, 403)

    def test_non_staff_non_author_cannot_update_gameday_retrieve_update(self):
        author, gameday = self._create_gameday_with_author("ru_author2")
        other_user = DBSetup().create_new_user("ru_non_author")
        response = self.app.put_json(
            reverse("api-gameday-retrieve-update", kwargs={"pk": gameday.pk}),
            {
                "name": "Hacked", "date": str(gameday.date), "start": gameday.start,
                "season": gameday.season_id, "league": gameday.league_id,
            },
            headers=DBSetup().get_token_header(user=other_user),
            expect_errors=True,
        )
        assert response.status_code == 403

    def test_author_can_update_own_gameday_via_retrieve_update(self):
        author, gameday = self._create_gameday_with_author("ru_author3")
        response = self.app.put_json(
            reverse("api-gameday-retrieve-update", kwargs={"pk": gameday.pk}),
            {
                "name": "Updated Name", "date": str(gameday.date), "start": gameday.start,
                "season": gameday.season_id, "league": gameday.league_id,
            },
            headers=DBSetup().get_token_header(user=author),
        )
        assert response.status_code == 200
        gameday.refresh_from_db()
        assert gameday.name == "Updated Name"

    def test_staff_can_update_any_gameday_via_retrieve_update(self):
        author, gameday = self._create_gameday_with_author("ru_author4")
        staff_user = DBSetup().create_new_user("ru_staff", is_staff=True)
        response = self.app.put_json(
            reverse("api-gameday-retrieve-update", kwargs={"pk": gameday.pk}),
            {
                "name": "Staff Edit", "date": str(gameday.date), "start": gameday.start,
                "season": gameday.season_id, "league": gameday.league_id,
            },
            headers=DBSetup().get_token_header(user=staff_user),
        )
        assert response.status_code == 200
        gameday.refresh_from_db()
        assert gameday.name == "Staff Edit"

    # ── AutoAssignOfficialsView (POST /api/gameday/{id}/auto-assign-officials/) ──

    def test_anonymous_cannot_auto_assign_officials(self):
        author, gameday = self._create_gameday_with_author("aa_author")
        response = self.app.post(
            reverse("api-gameday-auto-assign-officials", kwargs={"pk": gameday.pk}),
            expect_errors=True,
        )
        assert response.status_code in (401, 403)

    def test_non_staff_non_author_cannot_auto_assign_officials(self):
        author, gameday = self._create_gameday_with_author("aa_author2")
        other_user = DBSetup().create_new_user("aa_non_author")
        response = self.app.post(
            reverse("api-gameday-auto-assign-officials", kwargs={"pk": gameday.pk}),
            headers=DBSetup().get_token_header(user=other_user),
            expect_errors=True,
        )
        assert response.status_code == 403

    def test_staff_can_auto_assign_officials(self):
        author, gameday = self._create_gameday_with_author("aa_author3")
        staff_user = DBSetup().create_new_user("aa_staff", is_staff=True)
        response = self.app.post(
            reverse("api-gameday-auto-assign-officials", kwargs={"pk": gameday.pk}),
            headers=DBSetup().get_token_header(user=staff_user),
        )
        # The response may be 200 (success) or 400 (no designer state / validation error)
        # depending on the gameday setup — the point is it is NOT 401/403.
        assert response.status_code in (200, 400)

    def test_auto_assign_officials_error_does_not_leak_exception_detail(self):
        """CodeQL py/stack-trace-exposure (alert #69): the raw exception text
        must never reach the HTTP response, only the server-side log."""
        author, gameday = self._create_gameday_with_author("aa_author5")
        staff_user = DBSetup().create_new_user("aa_staff3", is_staff=True)
        sensitive_detail = "internal detail: /srv/leaguesphere/secret_config.py line 42"

        with patch(
            "gamedays.api.views.AutoAssignOfficialsService.assign",
            side_effect=AutoAssignOfficialsError(sensitive_detail),
        ):
            with self.assertLogs("gamedays.api.views", level="WARNING") as logs:
                response = self.app.post(
                    reverse("api-gameday-auto-assign-officials", kwargs={"pk": gameday.pk}),
                    headers=DBSetup().get_token_header(user=staff_user),
                    expect_errors=True,
                )

        assert response.status_code == 400
        assert sensitive_detail not in response.text
        assert any(sensitive_detail in message for message in logs.output)

    # ── GameOfficialCreateOrUpdateView (PUT /api/game/{id}/officials) ──

    def test_anonymous_cannot_update_game_officials(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        response = self.app.put_json(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": gameinfo.pk}),
            [{"name": "Saskia", "position": "referee"}],
            expect_errors=True,
        )
        assert response.status_code in (401, 403)

    def test_non_staff_non_author_can_update_game_officials(self):
        # Officials are assigned on-site by whichever team/crew is running the
        # scorecard for that game — not necessarily the gameday's staff/author.
        # See #1634: PR #1596 (fixing #1591, which was about the unrelated
        # gameday-designer publish/state endpoints) over-applied the
        # staff-or-author gate to this endpoint too, blocking every non-staff
        # scorecard operator in production.
        gameday = DBSetup().g62_status_empty()
        gameday.author = DBSetup().create_new_user("go_author")
        gameday.save()
        gameinfo = Gameinfo.objects.first()
        other_user = DBSetup().create_new_user("go_non_author")
        response = self.app.put_json(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": gameinfo.pk}),
            [{"name": "Saskia", "position": "referee"}],
            headers=DBSetup().get_token_header(user=other_user),
        )
        assert response.status_code == 200

    def test_author_can_update_game_officials_for_own_gameday(self):
        gameday = DBSetup().g62_status_empty()
        gameday.author = DBSetup().create_new_user("go_author2")
        gameday.save()
        gameinfo = Gameinfo.objects.first()
        response = self.app.put_json(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": gameinfo.pk}),
            [{"name": "Saskia", "position": "referee"}],
            headers=DBSetup().get_token_header(user=gameday.author),
        )
        assert response.status_code == 200

    def test_staff_can_update_game_officials(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        staff_user = DBSetup().create_new_user("go_staff", is_staff=True)
        response = self.app.put_json(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": gameinfo.pk}),
            [{"name": "Saskia", "position": "referee"}],
            headers=DBSetup().get_token_header(user=staff_user),
        )
        assert response.status_code == 200
