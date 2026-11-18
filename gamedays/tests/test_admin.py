from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import TestCase, Client, RequestFactory
from django.urls import reverse

from gamedays.admin import GameresultAdmin, GameinfoAdmin, TeamAdmin
from gamedays.models import (
    Tournament,
    TournamentRow,
    TournamentColumn,
    TournamentColumnGame,
    Gameday,
    GamedayDesignerState,
    Gameinfo,
    Gameresult,
    GameSetup,
    Team,
)
from gamedays.tests.setup_factories.factories import (
    LeagueFactory,
    SeasonFactory,
    TeamFactory,
    GamedayFactory,
    GameSetupFactory,
    GameinfoFactory,
    GameresultFactory,
    TournamentFactory,
    TournamentRowFactory,
    TournamentColumnFactory,
    TournamentColumnGameFactory,
)


class TournamentAdminRegistrationTests(TestCase):
    def test_tournament_admin_registered(self):
        self.assertIn(Tournament, admin.site._registry)

    def test_tournament_row_admin_registered(self):
        self.assertIn(TournamentRow, admin.site._registry)

    def test_tournament_column_admin_registered(self):
        self.assertIn(TournamentColumn, admin.site._registry)

    def test_tournament_column_game_admin_registered(self):
        self.assertIn(TournamentColumnGame, admin.site._registry)


class TournamentAdminPageLoadTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff_user = User.objects.create_superuser(
            username="staffuser", email="staff@test.com", password="testpass123"
        )

    def setUp(self):
        self.client = Client()
        self.client.login(username="staffuser", password="testpass123")

    def test_tournament_changelist_loads(self):
        response = self.client.get("/admin/gamedays/tournament/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_row_changelist_loads(self):
        response = self.client.get("/admin/gamedays/tournamentrow/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_column_changelist_loads(self):
        response = self.client.get("/admin/gamedays/tournamentcolumn/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_column_game_changelist_loads(self):
        response = self.client.get("/admin/gamedays/tournamentcolumngame/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_add_page_loads(self):
        response = self.client.get("/admin/gamedays/tournament/add/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_add_page_includes_resource_url_inline(self):
        response = self.client.get("/admin/gamedays/tournament/add/")
        self.assertEqual(response.status_code, 200)
        # Check that ResourceUrl inline is present (look for the prefix used by inlines)
        self.assertIn("resourceurl_set", response.content.decode())

    def test_tournament_change_page_includes_resource_url_inline(self):
        tournament = TournamentFactory(name="Test Tournament")
        response = self.client.get(
            f"/admin/gamedays/tournament/{tournament.id}/change/"
        )
        self.assertEqual(response.status_code, 200)
        # Check that ResourceUrl inline is present
        self.assertIn("resourceurl_set", response.content.decode())

    def test_tournament_list_displays_show_league_name_and_show_field(self):
        tournament = TournamentFactory(
            name="Test Tournament", show_league_name=True, show_field=True
        )
        response = self.client.get("/admin/gamedays/tournament/")
        self.assertEqual(response.status_code, 200)
        # Verify list_display includes the new fields
        content = response.content.decode()
        self.assertIn("show_league_name", content)
        self.assertIn("show_field", content)

    def test_tournament_change_page_includes_show_league_name_field(self):
        tournament = TournamentFactory(name="Test Tournament")
        response = self.client.get(
            f"/admin/gamedays/tournament/{tournament.id}/change/"
        )
        self.assertEqual(response.status_code, 200)
        # Check that show_league_name field is present
        self.assertIn("show_league_name", response.content.decode())

    def test_tournament_change_page_includes_show_field_field(self):
        tournament = TournamentFactory(name="Test Tournament")
        response = self.client.get(
            f"/admin/gamedays/tournament/{tournament.id}/change/"
        )
        self.assertEqual(response.status_code, 200)
        # Check that show_field field is present
        self.assertIn("show_field", response.content.decode())

    def test_tournament_row_add_page_loads(self):
        response = self.client.get("/admin/gamedays/tournamentrow/add/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_column_add_page_loads(self):
        response = self.client.get("/admin/gamedays/tournamentcolumn/add/")
        self.assertEqual(response.status_code, 200)

    def test_tournament_column_game_add_page_loads(self):
        response = self.client.get("/admin/gamedays/tournamentcolumngame/add/")
        self.assertEqual(response.status_code, 200)

    def test_gameinfo_admin_autocomplete_endpoint(self):
        season = SeasonFactory(name="2024")
        league = LeagueFactory(name="Division 1")
        gameday = GamedayFactory(season=season, league=league, name="Gameday 1")
        gi = GameinfoFactory(gameday=gameday, field=1)

        # The fact that Gameinfo admin has search_fields configured means the autocomplete
        # endpoint can be used. We just verify the admin can access the search page.
        response = self.client.get("/admin/gamedays/gameinfo/")
        self.assertEqual(response.status_code, 200)
        # Verify that search_fields are configured (no error about missing search_fields)
        self.assertIn("gameinfo", response.content.decode())

    def test_gameinfo_admin_search_fields(self):
        season = SeasonFactory(name="2024")
        league = LeagueFactory(name="Division 1")
        gameday = GamedayFactory(season=season, league=league, name="Test Gameday")
        gameinfo = GameinfoFactory(gameday=gameday, field=1, stage="Vorrunde")

        # Search by gameday name should work
        response = self.client.get("/admin/gamedays/gameinfo/?q=Test+Gameday")
        self.assertEqual(response.status_code, 200)

        # Search by stage should work
        response = self.client.get("/admin/gamedays/gameinfo/?q=Vorrunde")
        self.assertEqual(response.status_code, 200)


class GameResultTeamAdminRegistrationTests(TestCase):
    """Covers leaguesphere#1934: give staff a way to fix a wrong/placeholder
    team assignment on an already-published, entered-results gameday without
    touching the unlock/republish guard."""

    def test_gameresult_admin_registered(self):
        self.assertIn(Gameresult, admin.site._registry)
        self.assertIsInstance(admin.site._registry[Gameresult], GameresultAdmin)

    def test_team_admin_registered(self):
        self.assertIn(Team, admin.site._registry)
        self.assertIsInstance(admin.site._registry[Team], TeamAdmin)


class GameResultAdminPageLoadTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff_user = User.objects.create_superuser(
            username="staffuser2", email="staff2@test.com", password="testpass123"
        )

    def setUp(self):
        self.client = Client()
        self.client.login(username="staffuser2", password="testpass123")

    def test_gameresult_changelist_loads(self):
        response = self.client.get("/admin/gamedays/gameresult/")
        self.assertEqual(response.status_code, 200)

    def test_gameresult_search_by_gameday_name(self):
        season = SeasonFactory(name="2024")
        league = LeagueFactory(name="Division 1")
        gameday = GamedayFactory(season=season, league=league, name="Final 6")
        gi = GameinfoFactory(gameday=gameday, field=1)
        GameresultFactory(gameinfo=gi, team=TeamFactory(name="Rank 1 Gruppe 2"))

        response = self.client.get("/admin/gamedays/gameresult/?q=Final+6")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Rank 1 Gruppe 2", response.content)

    def test_gameresult_change_page_orders_gameday_teams_first(self):
        season = SeasonFactory(name="2024")
        league = LeagueFactory(name="Division 1")
        gameday = GamedayFactory(season=season, league=league, name="Final 6")
        other_gameday = GamedayFactory(
            season=season, league=league, name="Other Gameday"
        )

        team_alpha = TeamFactory(name="TeamAlpha")
        team_beta = TeamFactory(name="TeamBeta")
        team_unrelated = TeamFactory(name="TeamUnrelated")

        gi = GameinfoFactory(gameday=gameday, field=1)
        home_result = GameresultFactory(gameinfo=gi, team=team_alpha, isHome=True)
        GameresultFactory(gameinfo=gi, team=team_beta, isHome=False)

        other_gi = GameinfoFactory(gameday=other_gameday, field=1)
        GameresultFactory(gameinfo=other_gi, team=team_unrelated, isHome=True)

        response = self.client.get(
            f"/admin/gamedays/gameresult/{home_result.id}/change/"
        )
        self.assertEqual(response.status_code, 200)
        content = response.content.decode()

        alpha_pos = content.index(">TeamAlpha<")
        beta_pos = content.index(">TeamBeta<")
        unrelated_pos = content.index(">TeamUnrelated<")
        self.assertLess(alpha_pos, unrelated_pos)
        self.assertLess(beta_pos, unrelated_pos)

    def test_gameresult_add_page_does_not_restrict_team_choices(self):
        # No object_id on the add page -> nothing to derive a gameday from,
        # so the full Team table stays available (not narrowed to empty).
        team = TeamFactory(name="SomeTeam")
        response = self.client.get("/admin/gamedays/gameresult/add/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(f">{team.name}<".encode(), response.content)


class GameinfoAdminResavePropagationActionTests(TestCase):
    """The admin action is the UI-reachable equivalent of the
    `Gameinfo.objects.get(pk=...).save()` repair recipe documented on
    leaguesphere#1934: re-saving a completed game re-fires post_save, which
    re-runs CanvasBracketProgressionService and cascades a corrected team
    assignment to whatever downstream game references its winner."""

    @classmethod
    def setUpTestData(cls):
        cls.staff_user = User.objects.create_superuser(
            username="staffuser3", email="staff3@test.com", password="testpass123"
        )

    def setUp(self):
        self.client = Client()
        self.client.login(username="staffuser3", password="testpass123")

        season = SeasonFactory(name="2024")
        league = LeagueFactory(name="Division 1")
        self.gameday = GamedayFactory(season=season, league=league, name="Final 6")
        officials_team = TeamFactory(name="Officiating Team")

        self.team_a = TeamFactory(name="Winner Candidate A")
        self.team_b = TeamFactory(name="Winner Candidate B")
        placeholder = TeamFactory(name="Rank 1 Gruppe 2")

        self.prelim = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="10:00",
            field=1,
            officials=officials_team,
            stage="Vorrunde",
            standing="G1",
            status=Gameinfo.STATUS_COMPLETED,
        )
        self.final = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="12:00",
            field=1,
            officials=officials_team,
            stage="Finale",
            standing="FIN",
            status=Gameinfo.STATUS_PUBLISHED,
        )
        Gameresult.objects.create(gameinfo=self.final, team=placeholder, isHome=True)

        GamedayDesignerState.objects.create(
            gameday=self.gameday,
            state_data={
                "nodes": [
                    {
                        "id": "game-g1",
                        "type": "game",
                        "data": {"stage": "Vorrunde", "standing": "G1"},
                    },
                    {
                        "id": "game-fin",
                        "type": "game",
                        "data": {
                            "stage": "Finale",
                            "standing": "FIN",
                            "homeTeamDynamic": {"type": "winner", "matchName": "G1"},
                        },
                    },
                ]
            },
        )

        # Scores entered after the fact -- Gameresult has no post_save signal,
        # so nothing propagates automatically yet (mirrors the real incident).
        Gameresult.objects.create(
            gameinfo=self.prelim, team=self.team_a, isHome=True, fh=1, sh=0
        )
        Gameresult.objects.create(
            gameinfo=self.prelim, team=self.team_b, isHome=False, fh=2, sh=0
        )

    def test_resave_action_repropagates_winner(self):
        final_home = Gameresult.objects.get(gameinfo=self.final, isHome=True)
        self.assertEqual(final_home.team, Team.objects.get(name="Rank 1 Gruppe 2"))

        response = self.client.post(
            "/admin/gamedays/gameinfo/",
            {
                "action": "resave_to_repropagate",
                "_selected_action": [str(self.prelim.pk)],
                "index": 0,
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)

        final_home.refresh_from_db()
        self.assertEqual(final_home.team, self.team_b)  # away scored more -> winner
        self.assertIn(b"Re-saved 1 completed game", response.content)

    def test_resave_action_skips_non_completed_games(self):
        response = self.client.post(
            "/admin/gamedays/gameinfo/",
            {
                "action": "resave_to_repropagate",
                "_selected_action": [str(self.final.pk)],
                "index": 0,
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Skipped 1 game", response.content)

        final_home = Gameresult.objects.get(gameinfo=self.final, isHome=True)
        self.assertEqual(final_home.team.name, "Rank 1 Gruppe 2")  # unchanged


class GameSetupAdminTests(TestCase):
    """The device lock must be findable and releasable from the admin.

    The old bare ``admin.site.register(GameSetup)`` showed a list of numbers
    ("9317", "9326") and nothing else: a staff member looking for the lock
    after a lost phone had no way in and had to guess the row. The changelist
    now names the game, and one action lifts the lock.
    """

    @classmethod
    def setUpTestData(cls):
        cls.staff_user = User.objects.create_superuser(
            username="staffuser4", email="staff4@test.com", password="testpass123"
        )
        cls.gameday = GamedayFactory(name="Final 8 - Tag 2")
        cls.game = GameinfoFactory(
            gameday=cls.gameday,
            scheduled="14:00",
            field=3,
            stage="Finalrunde",
            standing="P1",
            status="2. Halbzeit",
        )
        cls.home = TeamFactory(name="Wall")
        cls.away = TeamFactory(name="Spatz")
        GameresultFactory(gameinfo=cls.game, team=cls.home, isHome=True)
        GameresultFactory(gameinfo=cls.game, team=cls.away, isHome=False)
        cls.setup = GameSetupFactory(gameinfo=cls.game, device_id="6b23f2a3-lost")

    def setUp(self):
        self.client = Client()
        self.client.login(username="staffuser4", password="testpass123")

    def test_changelist_names_the_game_and_its_device(self):
        response = self.client.get("/admin/gamedays/gamesetup/")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("Final 8 - Tag 2", body)
        self.assertIn("Finalrunde", body)
        self.assertIn("6b23f2a3-lost", body)

    def test_search_finds_a_setup_by_a_team_name(self):
        other = GameinfoFactory(gameday=self.gameday, scheduled="16:00", field=1)
        GameSetupFactory(gameinfo=other, device_id="unrelated-device")

        response = self.client.get("/admin/gamedays/gamesetup/", {"q": "Spatz"})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "6b23f2a3-lost")
        self.assertNotContains(response, "unrelated-device")

    def test_release_action_clears_the_lock(self):
        response = self.client.post(
            "/admin/gamedays/gamesetup/",
            {
                "action": "release_lock",
                "_selected_action": [str(self.setup.pk)],
                "index": 0,
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.setup.refresh_from_db()
        self.assertEqual(self.setup.device_id, "")
        self.assertIn("Gerätesperre", response.content.decode())

    def test_release_action_says_when_there_was_nothing_to_release(self):
        GameSetup.objects.filter(pk=self.setup.pk).update(device_id="")

        response = self.client.post(
            "/admin/gamedays/gamesetup/",
            {
                "action": "release_lock",
                "_selected_action": [str(self.setup.pk)],
                "index": 0,
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("frei", response.content.decode())


class GameinfoResetReleasesDeviceLockTests(TestCase):
    """A game put back to ``Geplant`` is nobody's game.

    A reset kept ``GameSetup.device_id``, so the device that started it once
    could start it again while every other device was refused with "läuft auf
    einem anderen Gerät" — on the preparation screen, where no release exists.
    """

    @classmethod
    def setUpTestData(cls):
        cls.staff_user = User.objects.create_superuser(
            username="staffuser5", email="staff5@test.com", password="testpass123"
        )
        cls.gameday = GamedayFactory(name="Reset Cup")

    def setUp(self):
        self.request = RequestFactory().post("/admin/gamedays/gameinfo/1/change/")
        self.request.user = self.staff_user
        # ``save_model`` may report the release; the admin's middleware is not
        # in the request chain of a bare ``RequestFactory`` call.
        setattr(self.request, "session", {})
        self.request._messages = FallbackStorage(self.request)
        self.admin = GameinfoAdmin(Gameinfo, admin.site)

    def game(self, status):
        game = GameinfoFactory(gameday=self.gameday, status=status)
        return game, GameSetupFactory(gameinfo=game, device_id="desktop-device")

    def test_setting_a_game_back_to_planned_releases_the_lock(self):
        game, setup = self.game(status="2. Halbzeit")

        game.status = "Geplant"
        self.admin.save_model(self.request, game, form=None, change=True)

        setup.refresh_from_db()
        self.assertEqual(setup.device_id, "")

    def test_saving_a_game_that_still_runs_keeps_the_lock(self):
        game, setup = self.game(status="2. Halbzeit")

        game.standing = "P1"
        self.admin.save_model(self.request, game, form=None, change=True)

        setup.refresh_from_db()
        self.assertEqual(setup.device_id, "desktop-device")
