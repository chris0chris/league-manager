import os
from datetime import date, datetime
from http import HTTPStatus
from unittest.mock import patch, MagicMock

import pytest
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.contrib.messages import get_messages
from django.contrib.messages.storage.fallback import FallbackStorage
from django.db import connection, DataError
from django.test import TestCase, Client, RequestFactory
from django.test.utils import CaptureQueriesContext
from django_webtest import WebTest, DjangoWebtestResponse
from rest_framework.reverse import reverse
from webtest import Upload

from gamedays.models import Gameinfo, GameOfficial
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_manager.utils.serializer_utils import Obfuscator
from league_table.tests.setup_factories.factories_leaguetable import (
    LeagueSeasonConfigFactory,
)
from officials.models import Official, OfficialExternalGames, OfficialGamedaySignup
from officials.service.moodle.moodle_api import MoodleApiException
from officials.service.moodle.moodle_service import MoodleService
from gamedays.tests.setup_factories.factories import (
    TeamFactory,
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    GameresultFactory,
    UserFactory,
)
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import (
    OfficialFactory,
    OfficialLicenseFactory,
    OfficialLicenseHistoryFactory,
    OfficialExternalGamesFactory,
)
from officials.urls import (
    OFFICIALS_LIST_FOR_TEAM,
    OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
    OFFICIALS_LIST_FOR_ALL_TEAMS,
    OFFICIALS_STATISTICS,
    OFFICIALS_STATISTICS_FOR_SEASON,
    OFFICIALS_PROFILE_GAMELIST,
    OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE,
    OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE,
    OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD,
    OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM,
    OFFICIALS_LICENSE_CHECK,
    OFFICIALS_MOODLE_LOGIN,
    OFFICIALS_SIGN_UP_LIST,
    OFFICIALS_SIGN_UP_FOR_GAMEDAY,
    OFFICIALS_SIGN_OUT,
)
from officials.views import (
    IMPORT_ERROR_MESSAGE_LIMIT,
    MOODLE_LOGGED_IN_USER,
    MOODLE_REMEMBER_COOKIE,
    GameOfficialImportConfirmView,
)
from officials.service.remember_me import RememberMeService
from gamedays.tests.setup_factories.request_caches import pin_request_path_caches


class TestOfficialListView(WebTest):
    def test_unknown_team_returns_404(self):
        response = self.app.get(
            reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={"pk": 99999}),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_officials_names_are_obfuscated_for_anonymous_user(self):
        team = DbSetupOfficials().create_officials_full_setup()
        response = self.app.get(
            reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={"pk": team.pk})
        )
        assert response.status_code == HTTPStatus.OK
        officials_list = response.context["officials_list"]
        first_official: dict = officials_list[0]
        assert first_official.get("first_name") == "F****"
        assert first_official.get("last_name") == "F****"

    def test_officials_access_forbidden_for_authenticated_user_but_not_team_member(
        self,
    ):
        user = DBSetup().create_new_user("some user")
        self.app.set_user(user)
        team = DbSetupOfficials().create_officials_full_setup()
        response = self.app.get(
            reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={"pk": team.pk})
        )
        assert response.status_code == HTTPStatus.OK
        officials_list = response.context["officials_list"]
        first_official: dict = officials_list[1]
        assert first_official.get("first_name") == "J****"
        assert first_official.get("last_name") == "J****"

    def test_access_to_team_officials_only_for_team_member(self):
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(User.objects.first())
        response = self.app.get(
            reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={"pk": team.pk})
        )
        officials_list = response.context["officials_list"]
        all_officials = Official.objects.all()
        assert len(officials_list) == len(all_officials)


class TestOfficiatedGamesSection(TestCase):
    def _team_with_officiated_game(self, year=2027):
        team = TeamFactory(name="officiating-team")
        gameday = GamedayFactory(date=datetime(year, 5, 1).date(), name="Spieltag 1")
        gameinfo = GameinfoFactory(gameday=gameday, officials=team)
        GameOfficialFactory(gameinfo=gameinfo, official=None, position="Referee")
        GameresultFactory(gameinfo=gameinfo, isHome=True)
        GameresultFactory(gameinfo=gameinfo, isHome=False)
        return team, gameinfo

    def test_hidden_for_anonymous_user(self):
        team, _ = self._team_with_officiated_game()

        response = self.client.get(
            reverse(
                OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
                kwargs={"pk": team.pk, "season": 2027},
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert response.context["show_officiated_games"] is False
        assert "Geleitete Spiele" not in response.content.decode()

    def test_hidden_when_moodle_session_active(self):
        team, _ = self._team_with_officiated_game()
        self.client.force_login(UserFactory(username="some-user"))
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = 1
        session.save()

        response = self.client.get(
            reverse(
                OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
                kwargs={"pk": team.pk, "season": 2027},
            )
        )

        assert response.context["show_officiated_games"] is False

    def test_visible_for_any_authenticated_user(self):
        team, gameinfo = self._team_with_officiated_game()
        self.client.force_login(UserFactory(username="some-user"))

        response = self.client.get(
            reverse(
                OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
                kwargs={"pk": team.pk, "season": 2027},
            )
        )

        assert response.status_code == HTTPStatus.OK
        assert response.context["show_officiated_games"] is True
        games = response.context["officiated_games"]
        assert [game["gameinfo_id"] for game in games] == [gameinfo.id]
        assert "Geleitete Spiele" in response.content.decode()

    def test_query_count_is_not_paid_when_section_is_hidden(self):
        team, _ = self._team_with_officiated_game()
        url = reverse(
            OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
            kwargs={"pk": team.pk, "season": 2027},
        )
        # Warm request-path caches so the query count is not order-dependent
        # under parallel (xdist) runs.
        self.client.get(url)

        pin_request_path_caches()
        with self.assertNumQueries(5):
            response = self.client.get(url)

        assert response.status_code == HTTPStatus.OK
        assert response.context["show_officiated_games"] is False

    def test_excludes_games_officiated_by_a_different_team(self):
        team, gameinfo = self._team_with_officiated_game()
        other_team = TeamFactory(name="other-team")
        other_gameday = GamedayFactory(date=datetime(2027, 5, 8).date())
        other_gameinfo = GameinfoFactory(gameday=other_gameday, officials=other_team)
        GameOfficialFactory(gameinfo=other_gameinfo, official=None, position="Referee")
        GameresultFactory(gameinfo=other_gameinfo, isHome=True)
        GameresultFactory(gameinfo=other_gameinfo, isHome=False)
        self.client.force_login(UserFactory(username="some-user"))

        response = self.client.get(
            reverse(
                OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
                kwargs={"pk": team.pk, "season": 2027},
            )
        )

        games = response.context["officiated_games"]
        assert [game["gameinfo_id"] for game in games] == [gameinfo.id]

    def test_violation_badge_renders_for_a_flagged_game(self):
        team, gameinfo = self._team_with_officiated_game()
        LeagueSeasonConfigFactory(
            league=gameinfo.gameday.league,
            season=gameinfo.gameday.season,
            check_officials_automatically=True,
            min_officials_per_game=1,
        )
        self.client.force_login(UserFactory(username="some-user"))

        response = self.client.get(
            reverse(
                OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
                kwargs={"pk": team.pk, "season": 2027},
            )
        )

        games = response.context["officiated_games"]
        assert len(games[0]["officials_violations"]) == 1
        content = response.content.decode()
        assert 'class="badge bg-danger"' in content


class TestAllTeamsCardListView(WebTest):
    def setUp(self):
        # get_all_teams() caches under a fixed "all_teams" key for 24h -
        # must be cleared so tests don't see another test's stale team
        # list (surfaces as flakiness under parallel/xdist runs).
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_renders_new_card_template_with_search_and_cards(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        official = OfficialFactory(
            first_name="A",
            last_name="One",
            team=team,
            association=association,
            external_id="1",
        )
        OfficialLicenseHistoryFactory(
            official=official, license=license_f1, created_at="2021-01-01"
        )

        response = self.app.get(reverse(OFFICIALS_LIST_FOR_ALL_TEAMS))

        assert response.status_code == HTTPStatus.OK
        template_names = [t.name for t in response.templates if t.name is not None]
        assert "officials/all_teams_card_list.html" in template_names
        assert "team/all_teams_list.html" not in template_names
        content = response.content.decode()
        assert 'id="team-search"' in content
        assert 'class="card' in content
        assert f'data-team-name="{team.description.lower()}"' in content
        assert "1 - Offizielle" in content

    def test_officials_on_placeholder_team_do_not_inflate_other_team_counts(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        no_team = TeamFactory(pk=Official.OHNE_TEAM_ID, name="Ohne Team")
        association = DBSetup().create_new_association()
        OfficialFactory(
            first_name="A",
            last_name="One",
            team=team,
            association=association,
            external_id="1",
        )
        OfficialFactory(
            first_name="B",
            last_name="Two",
            team=no_team,
            association=association,
            external_id="2",
        )

        response = self.app.get(reverse(OFFICIALS_LIST_FOR_ALL_TEAMS))

        breakdown_by_team = {
            entry["team"].pk: entry["license_breakdown"]
            for entry in response.context["teams_with_breakdown"]
        }
        assert breakdown_by_team[team.pk]["total"] == 1

    def test_query_count_does_not_scale_with_number_of_teams_or_officials(self):
        # An absolute assertNumQueries() on the full response would also
        # count maintenance/session/menu middleware queries unrelated to
        # this view, making the number fragile to unrelated changes.
        # Comparing query counts between a small and a large dataset
        # instead isolates whether THIS view's own logic scales with row
        # count - middleware overhead is constant either way, so it
        # cancels out of the comparison - matching what CLAUDE.md's
        # query-count policy actually requires ("query count must NOT
        # increase with result set size").
        def build_team_with_official(name):
            team = TeamFactory(name=name, description=name)
            association = DBSetup().create_new_association()
            official = OfficialFactory(
                first_name=name,
                last_name=name,
                team=team,
                association=association,
                external_id=name,
            )
            OfficialLicenseHistoryFactory(
                official=official,
                license=OfficialLicenseFactory(id=1, name="F1"),
                created_at="2021-01-01",
            )

        build_team_with_official("Small")
        cache.clear()  # keep both measurements at the same "cold cache" state
        with CaptureQueriesContext(connection) as small_dataset:
            self.app.get(reverse(OFFICIALS_LIST_FOR_ALL_TEAMS))

        for i in range(20):
            build_team_with_official(f"Extra{i}")
        cache.clear()
        with CaptureQueriesContext(connection) as large_dataset:
            self.app.get(reverse(OFFICIALS_LIST_FOR_ALL_TEAMS))

        assert len(large_dataset.captured_queries) == len(
            small_dataset.captured_queries
        )


class TestOfficialsStatisticsView(WebTest):
    def setUp(self):
        # _get_years() caches under a fixed key for 24h - must be
        # cleared so tests don't see another test's stale year list.
        cache.clear()

    def tearDown(self):
        cache.clear()

    @staticmethod
    def _game_official(gameday, position, official):
        gameinfo = GameinfoFactory(gameday=gameday)
        GameOfficialFactory(gameinfo=gameinfo, position=position, official=official)

    @classmethod
    def _game_officials(cls, gameday, position, official, count):
        # The statistics page only shows officials with at least 10
        # LeagueSphere games by default - use this to give a test
        # official enough games to actually appear on the page.
        for _ in range(count):
            cls._game_official(gameday, position, official)

    def test_lists_officials_ranked_by_leaguesphere_games_for_selected_season(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        official_top = OfficialFactory(
            first_name="Maximilian",
            last_name="Mustermann",
            team=team,
            association=association,
            external_id="1",
        )
        official_second = OfficialFactory(
            first_name="Julia",
            last_name="Jansen",
            team=team,
            association=association,
            external_id="2",
        )

        gameday_2024 = GamedayFactory(date="2024-05-01")
        self._game_officials(gameday_2024, "Referee", official_top, 12)
        self._game_officials(gameday_2024, "Referee", official_second, 10)

        response = self.app.get(
            reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
        )

        assert response.status_code == HTTPStatus.OK
        template_names = [t.name for t in response.templates if t.name is not None]
        assert "officials/statistics.html" in template_names

        officials_list = list(response.context["officials_list_without_external"])
        assert [o.pk for o in officials_list] == [
            official_top.pk,
            official_second.pk,
        ]

        content = response.content.decode()
        # License number links to the official's profile for that season.
        assert (
            reverse(
                OFFICIALS_PROFILE_GAMELIST,
                kwargs={"pk": official_top.pk, "season": 2024},
            )
            in content
        )
        # Total games ("Gesamt") is the first of the numeric columns,
        # ahead of the per-position counts - checked within the table
        # header row, since the intro paragraph also mentions "Referee".
        header_row = content[content.index("<thead>") : content.index("</thead>")]
        assert header_row.index("Gesamt") < header_row.index("Referee")
        assert header_row.index("Gesamt") < header_row.index("Down Judge")

    def test_names_are_obfuscated_for_anonymous_users(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Maximilian",
            last_name="Mustermann",
            team=team,
            association=association,
            external_id="1",
        )
        gameday_2024 = GamedayFactory(date="2024-05-01")
        self._game_officials(gameday_2024, "Referee", official, 10)

        response = self.app.get(
            reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
        )

        content = response.content.decode()
        assert "Maximilian Mustermann" not in content
        # Same obfuscation mechanism as OfficialSerializer.get_name(): each
        # name part reduced to its first letter + "****".
        assert Obfuscator.obfuscate("Maximilian", "Mustermann") in content

    def test_names_are_shown_in_full_for_staff_users(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Maximilian",
            last_name="Mustermann",
            team=team,
            association=association,
            external_id="1",
        )
        gameday_2024 = GamedayFactory(date="2024-05-01")
        self._game_officials(gameday_2024, "Referee", official, 10)
        self.app.set_user(DBSetup().create_new_user("staff_user", is_staff=True))

        response = self.app.get(
            reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
        )

        assert "Maximilian Mustermann" in response.content.decode()

    def test_shows_the_officials_current_license(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Maximilian",
            last_name="Mustermann",
            team=team,
            association=association,
            external_id="1",
        )
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        # A license taken earlier in the same season year still counts -
        # matches official #2435's real bug report.
        OfficialLicenseHistoryFactory(
            official=official,
            license=license_f1,
            created_at="2024-02-01",
        )
        gameday_2024 = GamedayFactory(date="2024-05-01")
        self._game_officials(gameday_2024, "Referee", official, 10)

        response = self.app.get(
            reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
        )

        assert "F1" in response.content.decode()

    def test_defaults_to_current_year_when_no_season_given(self):
        response = self.app.get(reverse(OFFICIALS_STATISTICS))

        assert response.status_code == HTTPStatus.OK
        assert response.context["season"] == datetime.today().year

    def test_shows_the_unique_gamedays_count(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Maximilian",
            last_name="Mustermann",
            team=team,
            association=association,
            external_id="1",
        )
        gameday_2024 = GamedayFactory(date="2024-05-01")
        # All 10 games on the same single Gameday - one Spieltag attended.
        self._game_officials(gameday_2024, "Referee", official, 10)

        response = self.app.get(
            reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
        )

        content = response.content.decode()
        assert "Spieltage" in content
        officials_list = list(response.context["officials_list_without_external"])
        assert officials_list[0].unique_gamedays_count == 1

    def test_renders_both_tables_with_an_off_by_default_toggle(self):
        team = TeamFactory(name="Adler", description="Adler Hamburg")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Maximilian",
            last_name="Mustermann",
            team=team,
            association=association,
            external_id="1",
        )
        gameday_2024 = GamedayFactory(date="2024-05-01")
        self._game_officials(gameday_2024, "Referee", official, 10)
        OfficialExternalGamesFactory(
            official=official,
            number_games=6,
            date="2024-06-01",
            notification_date="2024-06-01",
            position="Referee",
            association=association,
            is_international=False,
            has_clockcontrol=True,
            halftime_duration=15,
            reporter_name="reporter",
            comment="",
        ).save()

        response = self.app.get(
            reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
        )

        assert response.status_code == HTTPStatus.OK
        content = response.content.decode()

        toggle = response.html.find("input", id="include-external-toggle")
        assert toggle is not None
        assert toggle.get("checked") is None  # off by default

        without_external = response.html.find(id="statistics-table-without-external")
        with_external = response.html.find(id="statistics-table-with-external")
        assert without_external is not None
        assert with_external is not None
        # The "with external" table starts hidden.
        assert "display:none" in with_external.get("style", "")
        assert "display:none" not in without_external.get("style", "")

        # "without_external" shows the LeagueSphere-only total (10); the
        # combined total (10 + 6 = 16) only appears in the "with
        # external" table. Compare exact text tokens (not raw HTML)
        # since the markup has whitespace/newlines around each cell's
        # value.
        without_external_values = list(without_external.stripped_strings)
        with_external_values = list(with_external.stripped_strings)
        assert "16" not in without_external_values
        assert "16" in with_external_values
        assert "10" in without_external_values

        assert "officials/js/statistics_toggle.js" in content

    def test_query_count_does_not_scale_with_number_of_officials_or_games(self):
        # See TestAllTeamsCardListView's test of the same name: comparing
        # query counts between a small and a large dataset (rather than
        # asserting an absolute number) isolates whether THIS view's own
        # logic scales with row count, without the assertion being
        # fragile to unrelated maintenance/session/menu middleware
        # changes.
        team = TeamFactory(name="Team A", description="Team A")
        association = DBSetup().create_new_association()
        gameday = GamedayFactory(date="2024-05-01")

        def build_official(name):
            official = OfficialFactory(
                first_name=name,
                last_name=name,
                team=team,
                association=association,
                external_id=name,
            )
            self._game_officials(gameday, "Referee", official, 10)

        build_official("Small")
        cache.clear()  # keep both measurements at the same "cold cache" state
        with CaptureQueriesContext(connection) as small_dataset:
            self.app.get(
                reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
            )

        for i in range(10):
            build_official(f"Extra{i}")
        cache.clear()
        with CaptureQueriesContext(connection) as large_dataset:
            self.app.get(
                reverse(OFFICIALS_STATISTICS_FOR_SEASON, kwargs={"season": 2024})
            )

        assert len(large_dataset.captured_queries) == len(
            small_dataset.captured_queries
        )


class TestAddInternalGameOfficialUpdateView(WebTest):
    def test_gameinfo_id_not_a_int(self):
        user = DBSetup().create_new_user("some user", is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE)
        )
        form = response.forms[1]
        form["entries"] = "str, 2, position"
        response = form.submit()
        self.assertFormError(
            response.context["form"], "entries", ["gameinfo_id muss eine Zahl sein!"]
        )

    def test_gameinfo_id_not_found(self):
        user = DBSetup().create_new_user("some user", is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE)
        )
        form = response.forms[1]
        form["entries"] = "0, 0, Referee"
        response = form.submit()
        self.assertFormError(
            response.context["form"], "entries", ["gameinfo_id nicht gefunden!"]
        )

    def test_official_id_not_found(self):
        user = DBSetup().create_new_user("some user", is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE)
        )
        form = response.forms[1]
        form["entries"] = f"{first_game.pk}, 9999, Field Judge"
        response = form.submit()
        self.assertFormError(
            response.context["form"], "entries", ["official_id nicht gefunden!"]
        )

    def test_position_illegal_entry(self):
        user = DBSetup().create_new_user("some user", is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        DbSetupOfficials().create_officials_and_team()
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE)
        )
        form = response.forms[1]
        form["entries"] = "1, 2, down judge"
        response = form.submit()
        self.assertFormError(
            response.context["form"],
            "entries",
            [
                "Position muss genau einen der Werte haben: "
                "Referee, Down Judge, Field Judge, Side Judge!"
            ],
        )

    def test_game_official_entry_successfull(self):
        user = DBSetup().create_new_user("some user", is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        DbSetupOfficials().create_officials_and_team()
        first_game = Gameinfo.objects.first()
        first_official = Official.objects.first()
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE)
        )
        form = response.forms[1]
        form["entries"] = f"{first_game.pk}, {first_official.pk + 1}, Side Judge"
        response = form.submit()
        assert (
            " - Julia Jegura als Side Judge"
            in response.html.find_all("div", {"class": "alert-success"})[0].text
        )

    def test_official_name_is_escaped_in_success_message(self):
        """The success message is built with format_html, not mark_safe."""
        user = DBSetup().create_new_user("some user", is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        team = DbSetupOfficials().create_officials_and_team()
        first_game = Gameinfo.objects.first()
        malicious_official = OfficialFactory(
            first_name="<script>alert(1)</script>", last_name="Evil", team=team
        )
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE)
        )
        form = response.forms[1]
        form["entries"] = f"{first_game.pk}, {malicious_official.pk}, Side Judge"
        response = form.submit()
        content = response.content.decode()
        assert "<script>alert(1)</script>" not in content
        assert "&lt;script&gt;alert(1)&lt;/script&gt;" in content


class TestGameCountOfficials(WebTest):
    @patch.object(MoodleService, "get_all_users_for_course")
    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_all_entries_will_be_checked(self, moodle_service_mock: MagicMock):
        if settings.MOODLE_URL is None or settings.MOODLE_URL == "None":
            pytest.skip("MOODLE_URL is not configured")
        user = DBSetup().create_new_user("some staff user", is_staff=True)
        self.app.set_user(user)
        DbSetupOfficials().create_officials_full_setup()
        all_official_ids = []
        current_official: Official
        for current_official in Official.objects.all():
            all_official_ids += [int(current_official.external_id)]
        moodle_service_mock.return_value = all_official_ids
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_LICENSE_CHECK, kwargs={"course_id": 7})
        )
        assert len(response.context["officials_list"]) == Official.objects.all().count()


class TestMoodleLogin(WebTest):
    @patch.object(MoodleService, "login")
    def test_login_fails_with_form_error(self, moodle_login_mock: MagicMock):
        error_text = "Invalid login"
        moodle_login_mock.side_effect = MoodleApiException(error_text)

        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_MOODLE_LOGIN))
        response.form["username"] = "invalid username"
        response.form["password"] = "secret password"
        response = response.form.submit()
        self.assertFormError(response.context["form"], None, [error_text])

    @patch.object(MoodleService, "login")
    def test_login_is_successful(self, moodle_login_mock: MagicMock):
        official_id = 7
        moodle_login_mock.return_value = official_id

        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_MOODLE_LOGIN))
        response.form["username"] = "valid username"
        response.form["password"] = "secret password"
        response = response.form.submit()
        assert response.client.session.get(MOODLE_LOGGED_IN_USER) == official_id
        assert response.url == reverse(OFFICIALS_SIGN_UP_LIST)

    @patch.object(RememberMeService, "issue")
    @patch.object(MoodleService, "login")
    def test_login_with_remember_me_sets_cookie(
        self, moodle_login_mock: MagicMock, issue_mock: MagicMock
    ):
        moodle_login_mock.return_value = 7
        issue_mock.return_value = "selector:validator"
        response = self.app.get(reverse(OFFICIALS_MOODLE_LOGIN))
        response.form["username"] = "valid username"
        response.form["password"] = "secret password"
        response.form["remember_me"] = True
        response = response.form.submit()
        assert MOODLE_REMEMBER_COOKIE in response.client.cookies

    @patch.object(MoodleService, "login")
    def test_login_without_remember_me_sets_no_cookie(
        self, moodle_login_mock: MagicMock
    ):
        moodle_login_mock.return_value = 7
        response = self.app.get(reverse(OFFICIALS_MOODLE_LOGIN))
        response.form["username"] = "valid username"
        response.form["password"] = "secret password"
        response = response.form.submit()
        assert MOODLE_REMEMBER_COOKIE not in response.client.cookies

    @patch.object(MoodleService, "login")
    def test_login_of_moodle_user_without_official_shows_form_error(
        self, moodle_login_mock: MagicMock
    ):
        # A valid Moodle account that has no matching Official must not 500.
        moodle_login_mock.side_effect = Official.DoesNotExist

        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_MOODLE_LOGIN))
        response.form["username"] = "valid_moodle_user_without_official"
        response.form["password"] = "secret password"
        response = response.form.submit()

        self.assertEqual(HTTPStatus.OK, response.status_code)
        self.assertFormError(
            response.context["form"],
            None,
            [
                "Für diesen Moodle-Account ist kein Official hinterlegt. "
                "Bitte wende dich an die Turnierleitung."
            ],
        )


class TestOfficialSignUpListView(WebTest):
    def test_redirect_to_login(self):
        response: DjangoWebtestResponse = self.client.get(
            reverse(OFFICIALS_SIGN_UP_LIST)
        )
        assert response.url == reverse(OFFICIALS_MOODLE_LOGIN)

    def test_valid_cookie_restores_session_without_redirect(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        cookie = RememberMeService.issue(official.pk)
        client = Client()
        client.cookies[MOODLE_REMEMBER_COOKIE] = cookie

        response = client.get(reverse(OFFICIALS_SIGN_UP_LIST))

        assert response.status_code == HTTPStatus.OK
        assert client.session.get(MOODLE_LOGGED_IN_USER) == official.pk

    def test_valid_cookie_is_rotated_on_restore(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        cookie = RememberMeService.issue(official.pk)
        client = Client()
        client.cookies[MOODLE_REMEMBER_COOKIE] = cookie

        response = client.get(reverse(OFFICIALS_SIGN_UP_LIST))

        rotated = response.cookies[MOODLE_REMEMBER_COOKIE].value
        assert rotated != cookie

    def test_expired_cookie_redirects_and_clears_cookie(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        cookie = RememberMeService.issue(official.pk)
        from officials.models import MoodleRememberToken
        from django.utils import timezone
        from datetime import timedelta

        MoodleRememberToken.objects.filter(selector=cookie.split(":", 1)[0]).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        client = Client()
        client.cookies[MOODLE_REMEMBER_COOKIE] = cookie

        response = client.get(reverse(OFFICIALS_SIGN_UP_LIST))

        assert response.url == reverse(OFFICIALS_MOODLE_LOGIN)
        # cookie deletion is signalled by an expired/empty Set-Cookie
        assert response.cookies[MOODLE_REMEMBER_COOKIE].value == ""


class TestOfficialSignOutView(TestCase):
    def test_logout_revokes_token_and_clears_cookie_and_session(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        cookie = RememberMeService.issue(official.pk)
        from officials.models import MoodleRememberToken

        selector = cookie.split(":", 1)[0]
        client = Client()
        session = client.session
        session[MOODLE_LOGGED_IN_USER] = official.pk
        session.save()
        client.cookies[MOODLE_REMEMBER_COOKIE] = cookie

        response = client.get(reverse(OFFICIALS_SIGN_OUT))

        assert response.url == reverse(OFFICIALS_MOODLE_LOGIN)
        assert MoodleRememberToken.objects.filter(selector=selector).count() == 0
        assert client.session.get(MOODLE_LOGGED_IN_USER) is None
        assert response.cookies[MOODLE_REMEMBER_COOKIE].value == ""


class TestOfficialSignUpView(TestCase):
    def test_official_id_not_found_in_session(self):
        response = self.client.get(reverse(OFFICIALS_SIGN_UP_FOR_GAMEDAY, args=[5]))
        messages = list(get_messages(response.wsgi_request))
        assert response.url == reverse(OFFICIALS_MOODLE_LOGIN)
        assert (
            messages[0].message
            == "Die Session der Moodle-Anmeldung ist ausgelaufen. Bitte erneut anmelden."
        )

    def test_user_is_already_signed_up_for_gameday(self):
        DbSetupOfficials().create_officials_and_team()
        gameday = DBSetup().create_empty_gameday()
        LeagueSeasonConfigFactory(league=gameday.league, season=gameday.season)
        official = Official.objects.first()
        OfficialGamedaySignup.objects.create(official=official, gameday=gameday)
        self.client = Client()
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = official.pk
        session.save()

        response = self.client.get(
            reverse(OFFICIALS_SIGN_UP_FOR_GAMEDAY, args=[gameday.pk])
        )
        messages = list(get_messages(response.wsgi_request))
        assert response.url == reverse(OFFICIALS_SIGN_UP_LIST)
        assert (
            messages[0].message
            == "Du bist bereits für den Spieltag gemeldet: Test Spieltag"
        )


IMPORT_HEADERS = [
    "Zeitstempel",
    "E-Mail für Rückfragen",
    "Für welchen Bereich möchtest du einen Einsatz melden?",
    "Wie ist die ID des fehlerhaften Spiels?",
    "Wie ist deine Lizenznummer?",
    "Welche Position?",
    "Sonstiges",
    "Lizenznummer",
    "Anzahl Spiele",
    "Wann hat der Einsatz stattgefunden?",
    "Welche Position?",
    "Unter welchem Verband hat der Einsatz stattgefunden?",
    "Internationales Turnier",
    "Dauer einer Halbzeit?",
    "Mit Clock Control?",
    "Anmerkung - Turniername",
    "Name",
    "E-Mail-Adresse",
]


def _import_csv_bytes(rows):
    lines = [",".join(f'"{h}"' for h in IMPORT_HEADERS)]
    for row in rows:
        lines.append(",".join(f'"{value}"' for value in row))
    return "\n".join(lines).encode("utf-8")


def _empty_import_row():
    return [""] * len(IMPORT_HEADERS)


def _external_import_row(
    official_id, number_games, event_date, position, association, halftime_duration
):
    row = _empty_import_row()
    row[2] = "außerhalb DFFL"
    row[7] = str(official_id)
    row[8] = str(number_games)
    row[9] = event_date
    row[10] = position
    row[11] = association
    row[13] = str(halftime_duration)
    return row


def _internal_fix_import_row(gameinfo_id, official_id, position):
    row = _empty_import_row()
    row[2] = "DFFL"
    row[3] = str(gameinfo_id)
    row[4] = str(official_id)
    row[5] = position
    return row


class TestGameOfficialImportUploadView(WebTest):
    def setUp(self):
        self.association = DbSetupOfficials.create_production_associations()["AFCVHH"]

    def test_non_staff_denied(self):
        user = DBSetup().create_new_user("some user")
        self.app.set_user(user)
        self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD), status=403)

    def test_upload_missing_columns_returns_json_error(self):
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))
        headers = [h for h in IMPORT_HEADERS if h != "Anzahl Spiele"]
        row = [
            v
            for i, v in enumerate(
                _external_import_row(1, 2, "01.05.2024", "Referee", "Hamburg", 20)
            )
            if IMPORT_HEADERS[i] != "Anzahl Spiele"
        ]
        content = "\n".join(
            [
                ",".join(f'"{h}"' for h in headers),
                ",".join(f'"{v}"' for v in row),
            ]
        ).encode("utf-8")
        form = response.forms[1]
        form["file"] = Upload("import.csv", content, "text/csv")
        response = form.submit(expect_errors=True)

        assert response.status_code == HTTPStatus.BAD_REQUEST
        error_message = response.json["errors"]["file"][0]
        assert error_message == "Die Datei konnte nicht verarbeitet werden."
        assert "Gefundene Spalten" not in error_message
        assert "Anzahl Spiele" not in error_message

    def test_valid_csv_upload_returns_grouped_json(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))
        form = response.forms[1]
        content = _import_csv_bytes(
            [
                _external_import_row(
                    official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20
                )
            ]
        )
        form["file"] = Upload("import.csv", content, "text/csv")
        response = form.submit()

        data = response.json
        assert len(data["external"]["new"]) == 1
        row = data["external"]["new"][0]
        assert row["official_display"] == "Franzi Fedora"
        assert row["include_default"] is True
        assert data["external"]["duplicate"] == []
        assert data["external"]["conflict"] == []
        assert data["internal_fix"] == {"new": [], "duplicate": [], "conflict": []}
        assert data["unclassified"] == []

    def test_valid_xlsx_upload_returns_grouped_json(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))
        form = response.forms[1]

        import io

        import openpyxl

        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.append(IMPORT_HEADERS)
        sheet.append(
            _external_import_row(official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20)
        )
        buffer = io.BytesIO()
        workbook.save(buffer)
        form["file"] = Upload(
            "import.xlsx",
            buffer.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response = form.submit()

        assert len(response.json["external"]["new"]) == 1

    def test_duplicate_rows_default_unchecked(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        OfficialExternalGamesFactory(
            official=official,
            number_games=2,
            date=date(2024, 5, 1),
            notification_date=date(2024, 5, 1),
            position="Referee",
            association=self.association,
            halftime_duration=20,
            has_clockcontrol=False,
            is_international=False,
            reporter_name="",
            comment="",
        ).save()
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))
        form = response.forms[1]
        form["file"] = Upload(
            "import.csv",
            _import_csv_bytes(
                [
                    _external_import_row(
                        official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20
                    )
                ]
            ),
            "text/csv",
        )
        response = form.submit()

        data = response.json
        assert data["external"]["new"] == []
        assert len(data["external"]["duplicate"]) == 1
        assert data["external"]["duplicate"][0]["include_default"] is False


class TestGameOfficialImportConfirmView(WebTest):
    def setUp(self):
        DbSetupOfficials.create_production_associations()

    def _upload(self, rows):
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))
        form = response.forms[1]
        form["file"] = Upload("import.csv", _import_csv_bytes(rows), "text/csv")
        return form.submit().json

    def _confirm(self, **row_number_lists):
        """The confirm form is submitted by JS (see the template) as one
        comma-joined string per branch, not one field per row (a real
        import can select thousands of rows at once, which hit Django's
        DATA_UPLOAD_MAX_NUMBER_FIELDS ceiling as separate fields) - so
        this joins each kwarg's list before posting. Also adds the CSRF
        token by hand, since this isn't a fetched-and-filled-in WebTest
        form - self._upload() already rendered a page with
        {% csrf_token %} on it, which sets the cookie this reads."""
        params = {
            field_name: ",".join(row_numbers)
            for field_name, row_numbers in row_number_lists.items()
        }
        params.setdefault("csrfmiddlewaretoken", self.app.cookies["csrftoken"])
        return self.app.post(
            reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM), params=params
        )

    def _confirm_ajax(self, **row_number_lists):
        params = {
            field_name: ",".join(row_numbers)
            for field_name, row_numbers in row_number_lists.items()
        }
        params.setdefault("csrfmiddlewaretoken", self.app.cookies["csrftoken"])
        return self.app.post(
            reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM),
            params=params,
            headers={"X-Requested-With": "XMLHttpRequest"},
        )

    def test_non_staff_denied(self):
        user = DBSetup().create_new_user("some user")
        self.app.set_user(user)
        self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM), status=403)

    def test_get_redirects_to_upload(self):
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM))
        assert response.url == reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD)

    def test_confirm_commits_only_selected_rows(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        # Two pre-existing assignments for the same (gameinfo, position),
        # made by *other* officials, put the internal-fix suggestion into
        # "conflict" (ambiguous) - its include_default is False, unlike
        # the "new" external row.
        other_team = TeamFactory(name="Other Team")
        existing_1 = OfficialFactory(
            first_name="Existing", last_name="One", team=other_team
        )
        existing_2 = OfficialFactory(
            first_name="Existing", last_name="Two", team=other_team
        )
        GameOfficialFactory(
            gameinfo=gameinfo, official=existing_1, position="Side Judge"
        )
        GameOfficialFactory(
            gameinfo=gameinfo, official=existing_2, position="Side Judge"
        )

        data = self._upload(
            [
                _external_import_row(
                    official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20
                ),
                _internal_fix_import_row(gameinfo.pk, official.pk, "Side Judge"),
            ]
        )
        external_row = data["external"]["new"][0]
        internal_row = data["internal_fix"]["conflict"][0]
        assert internal_row["include_default"] is False

        # Only confirm the external row - leave the ambiguous internal-fix
        # row unselected, exactly as its include_default suggests.
        response = self._confirm(external_rows=[str(external_row["row_number"])])

        assert response.status_code == HTTPStatus.FOUND
        assert OfficialExternalGames.objects.filter(official=official).exists()
        assert not GameOfficial.objects.filter(
            gameinfo=gameinfo, position="Side Judge", official=official
        ).exists()

    def test_ajax_confirm_returns_per_row_outcomes_instead_of_redirect(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()

        data = self._upload(
            [
                _external_import_row(
                    official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20
                ),
                _internal_fix_import_row(gameinfo.pk, official.pk, "Referee"),
            ]
        )
        external_row_number = str(data["external"]["new"][0]["row_number"])
        internal_row_number = str(data["internal_fix"]["new"][0]["row_number"])

        response = self._confirm_ajax(
            external_rows=[external_row_number],
            internal_rows=[internal_row_number],
        )

        assert response.status_code == HTTPStatus.OK
        payload = response.json
        created_external = payload["external"]["created"]
        assert len(created_external) == 1
        assert created_external[0]["row_number"] == int(external_row_number)
        assert "ID: " in created_external[0]["message"]
        created_internal = payload["internal_fix"]["created"]
        assert len(created_internal) == 1
        assert created_internal[0]["row_number"] == int(internal_row_number)
        assert f"Spiel {gameinfo.pk}" in created_internal[0]["message"]
        assert payload["summary"] == {
            "external_created": 1,
            "internal_created": 1,
            "error_count": 0,
        }
        assert OfficialExternalGames.objects.filter(official=official).exists()
        assert GameOfficial.objects.filter(
            gameinfo=gameinfo, position="Referee", official=official
        ).exists()

    def test_ajax_confirm_reports_per_row_errors_by_row_number(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        other_official_1 = OfficialFactory(first_name="A", last_name="One", team=team)
        other_official_2 = OfficialFactory(first_name="B", last_name="Two", team=team)

        data = self._upload(
            [
                _external_import_row(
                    official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20
                ),
                _external_import_row(
                    other_official_1.pk, 3, "01.05.2024", "Referee", "Hamburg", 20
                ),
                _external_import_row(
                    other_official_2.pk, 4, "01.05.2024", "Referee", "Hamburg", 20
                ),
            ]
        )
        rows = data["external"]["new"]
        stale_row_number = rows[0]["row_number"]
        other_row_numbers = [row["row_number"] for row in rows[1:]]
        official.delete()

        response = self._confirm_ajax(
            external_rows=[str(row["row_number"]) for row in rows]
        )

        assert response.status_code == HTTPStatus.OK
        payload = response.json
        assert [entry["row_number"] for entry in payload["external"]["created"]] == (
            other_row_numbers
        )
        errors = payload["external"]["errors"]
        assert len(errors) == 1
        assert errors[0]["row_number"] == stale_row_number
        assert "nicht gefunden" in errors[0]["message"]
        assert payload["summary"]["error_count"] == 1

    def test_official_deleted_between_upload_and_confirm_surfaces_per_row_error(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        official_pk = official.pk
        other_official_1 = OfficialFactory(first_name="A", last_name="One", team=team)
        other_official_2 = OfficialFactory(first_name="B", last_name="Two", team=team)

        data = self._upload(
            [
                _external_import_row(
                    official.pk, 2, "01.05.2024", "Referee", "Hamburg", 20
                ),
                _external_import_row(
                    other_official_1.pk, 3, "01.05.2024", "Referee", "Hamburg", 20
                ),
                _external_import_row(
                    other_official_2.pk, 4, "01.05.2024", "Referee", "Hamburg", 20
                ),
            ]
        )
        row_numbers = [str(row["row_number"]) for row in data["external"]["new"]]
        official.delete()

        response = self._confirm(external_rows=row_numbers)

        # The stale row's failure is isolated per row and doesn't block
        # the PRG redirect or abort the rest of the batch.
        assert response.status_code == HTTPStatus.FOUND
        response = response.follow()
        assert not OfficialExternalGames.objects.filter(
            official_id=official_pk
        ).exists()
        assert OfficialExternalGames.objects.filter(official=other_official_1).exists()
        assert OfficialExternalGames.objects.filter(official=other_official_2).exists()
        content = response.content.decode()
        assert "1 Fehler" in content
        assert "nicht gefunden" in content or "existiert nicht" in content.lower()

    def test_large_upload_groups_all_rows_and_confirm_commits_them(self):
        """Regression coverage for the original DOM-scale bug: a real
        import file has thousands of rows. The server now only ever
        returns JSON (no per-row template rendering at all), so there's
        no DOM-node ceiling to hit - this just proves a large batch still
        classifies and commits correctly end-to-end."""

        row_count = 300
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        rows = [
            _external_import_row(
                official.pk, number_games, "01.05.2024", "Referee", "Hamburg", 20
            )
            for number_games in range(1, row_count + 1)
        ]

        data = self._upload(rows)

        assert len(data["external"]["new"]) == row_count
        row_numbers = [str(row["row_number"]) for row in data["external"]["new"]]

        response = self._confirm(external_rows=row_numbers)

        assert response.status_code == HTTPStatus.FOUND
        response = response.follow()
        assert (
            OfficialExternalGames.objects.filter(official=official).count() == row_count
        )
        content = response.content.decode()
        assert f"{row_count} externe Einsätze erstellt" in content
        # Counts, not one line per created row.
        assert content.count("ID: ") == 0

    def test_database_error_detail_is_logged_not_returned(self):
        """A per-row DatabaseError names schema internals ("Data too long for
        column ..."). Staff get the fixed message; the detail only reaches the
        server log, never the JSON response (CWE-209)."""

        def too_long(_row):
            raise DataError("Data too long for column 'comment' at row 1")

        with self.assertLogs("officials.views", level="WARNING") as logs:
            created, errors = GameOfficialImportConfirmView._commit(
                [{"row_number": 3}], too_long, lambda item: item
            )

        assert created == []
        assert errors == [
            {
                "row_number": 3,
                "message": "Datenbankfehler - Zeile vermutlich zu lang für ein Feld",
            }
        ]
        logged = "\n".join(logs.output)
        assert "row 3" in logged
        assert "Data too long for column 'comment' at row 1" in logged

    def test_report_results_escapes_error_detail(self):
        """Per-row error messages can echo back CSV cell content."""
        request = RequestFactory().get("/")
        request.session = {}
        request._messages = FallbackStorage(request)

        GameOfficialImportConfirmView._report_results(
            request, 0, 0, ["<script>alert(1)</script>"]
        )

        rendered = "".join(str(m) for m in get_messages(request))
        assert "<script>alert(1)</script>" not in rendered
        assert "&lt;script&gt;alert(1)&lt;/script&gt;" in rendered

    def test_report_results_caps_the_listed_errors_and_counts_the_rest(self):
        """Past the limit the message reports a count, not one line per row."""
        request = RequestFactory().get("/")
        request.session = {}
        request._messages = FallbackStorage(request)
        errors = [f"<b>Zeile {i}</b>" for i in range(IMPORT_ERROR_MESSAGE_LIMIT + 3)]

        GameOfficialImportConfirmView._report_results(request, 0, 0, errors)

        rendered = "".join(str(m) for m in get_messages(request))
        assert "(und 3 weitere)" in rendered
        assert f"Zeile {IMPORT_ERROR_MESSAGE_LIMIT}" not in rendered
        assert "<b>" not in rendered
        assert "&lt;b&gt;Zeile 0&lt;/b&gt;" in rendered


class TestAddExternalGameOfficialUpdateView(WebTest):
    def setUp(self):
        DbSetupOfficials.create_production_associations()

    def test_non_staff_denied(self):
        user = DBSetup().create_new_user("some user")
        self.app.set_user(user)
        self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE), status=403)

    def test_official_id_not_found(self):
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        form = response.forms[1]
        form["entries"] = "9999, 2, 2024-05-01, Referee, Hamburg, 20"
        response = form.submit()
        self.assertFormError(
            response.context["form"], "entries", ["official_id nicht gefunden!"]
        )

    def test_number_games_not_a_number(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        form = response.forms[1]
        form["entries"] = f"{official.pk}, viel, 2024-05-01, Referee, Hamburg, 20"
        response = form.submit()
        self.assertFormError(
            response.context["form"], "entries", ["number_games muss eine Zahl sein!"]
        )

    def test_wrong_field_count(self):
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        form = response.forms[1]
        form["entries"] = "1, 2, 2024-05-01"
        response = form.submit()
        self.assertFormError(
            response.context["form"],
            "entries",
            ["Zeile muss genau 6 Werte haben!"],
        )

    def test_entry_successful(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        form = response.forms[1]
        form["entries"] = f"{official.pk}, 2, 2024-05-01, Referee, Hamburg, 20"
        response = form.submit()
        assert (
            "Franzi Fedora als Referee"
            in response.html.find_all("div", {"class": "alert-success"})[0].text
        )
        assert OfficialExternalGames.objects.filter(official=official).exists()

    def test_official_name_is_escaped_in_success_message(self):
        team = TeamFactory(name="Test Team")
        malicious_official = OfficialFactory(
            first_name="<script>alert(1)</script>", last_name="Evil", team=team
        )
        user = DBSetup().create_new_user("staff", is_staff=True)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        form = response.forms[1]
        form["entries"] = (
            f"{malicious_official.pk}, 2, 2024-05-01, Referee, Hamburg, 20"
        )
        response = form.submit()
        content = response.content.decode()
        assert "<script>alert(1)</script>" not in content
        assert "&lt;script&gt;alert(1)&lt;/script&gt;" in content
