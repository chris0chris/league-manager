from datetime import date

import pytest
from django.core.management import call_command
from django.db.models import Count

from gamedays.models import (
    GameOfficial,
    Gameday,
    Gameinfo,
    Person,
    ResourceUrl,
    Team,
)
from league_manager.management.commands._finals_demo_data import FINALS_GAMEDAYS
from league_manager.management.commands.seed_demo_data import (
    Command as SeedDemoData,
)
from officials.models import Official
from officials.service.officials_repository_service import OfficialsRepositoryService
from passcheck.models import (
    PasscheckVerification,
    Player,
    Playerlist,
    PlayerlistGameday,
)

OFFICIALS_TEAM_NAME = "Demo Officials"
COUNTED_POSITIONS = {"Referee", "Down Judge", "Field Judge", "Side Judge"}

FINALS_GAMEDAY_PKS = {gameday["pk"] for gameday in FINALS_GAMEDAYS}
FINALS_TEAM_NAMES = {
    team_name for gameday in FINALS_GAMEDAYS for team_name in gameday["teams"]
}


@pytest.mark.django_db
class TestSeedDemoDataOfficials:
    """The demo needs officials data so the officials help/statistics pages and
    the scorecard official dropdowns are populated for video capture."""

    def test_seed_creates_officials_team_with_officials(self):
        call_command("seed_demo_data")

        officials_team = Team.objects.get(name=OFFICIALS_TEAM_NAME)
        assert Official.objects.filter(team=officials_team).count() >= 4

    def test_seeded_game_officials_use_counted_positions(self):
        call_command("seed_demo_data")

        positions = set(GameOfficial.objects.values_list("position", flat=True))
        assert positions
        assert positions <= COUNTED_POSITIONS

    def test_at_least_one_seeded_official_has_ten_games(self):
        call_command("seed_demo_data")

        per_official = GameOfficial.objects.values("official").annotate(n=Count("id"))
        assert per_official, "no GameOfficial rows were seeded"
        assert max(row["n"] for row in per_official) >= 10

    def test_seeded_games_point_at_the_officials_team(self):
        call_command("seed_demo_data")

        assert Gameinfo.objects.filter(officials__name=OFFICIALS_TEAM_NAME).exists()

    def test_officials_statistics_are_populated(self):
        call_command("seed_demo_data")

        game = Gameinfo.objects.filter(officials__name=OFFICIALS_TEAM_NAME).first()
        assert game is not None
        season = game.gameday.date.year

        statistics = OfficialsRepositoryService().get_officials_statistics_for_season(
            season
        )

        assert statistics["without_external"]


@pytest.mark.django_db
class TestSeedDemoDataRosters:
    """The scorecard's jersey picker reads the roster of the gameday (the
    passcheck snapshot), so every seeded game needs players on both sides —
    otherwise the demo only ever shows "Kein Kader geladen"."""

    def test_every_seeded_game_has_a_roster_for_both_teams(
        self, client, django_user_model
    ):
        call_command("seed_demo_data")
        client.force_login(django_user_model.objects.create_user("roster-check"))

        games = Gameinfo.objects.all()
        assert games
        for game in games:
            response = client.get(f"/api/game/{game.pk}/roster")
            assert response.status_code == 200
            sides = {row["side"] for row in response.json()}
            assert sides == {"home", "away"}, (game.pk, sides)

    def test_checking_in_again_adds_no_second_roster_entry(self):
        call_command("seed_demo_data")
        first = PlayerlistGameday.objects.count()

        added = SeedDemoData().create_gameday_rosters(list(Gameday.objects.all()))

        assert first > 0
        assert added == 0
        assert PlayerlistGameday.objects.count() == first


def _rostered_teams():
    """The synthetic demo teams that play a seeded game (no finals teams)."""
    return (
        Team.objects.filter(gameresult__isnull=False)
        .exclude(name__in=FINALS_TEAM_NAMES)
        .distinct()
    )


@pytest.mark.django_db
class TestSeedDemoDataFixedRoster:
    """The demo database survives deploys and is seeded again on each fresh
    container, so the seed must find its players instead of adding new ones:
    every demo team keeps exactly ten, jerseys 1–10."""

    def test_seeding_again_keeps_ten_players_per_team(self):
        call_command("seed_demo_data")
        call_command("seed_demo_data")

        teams = _rostered_teams()
        assert teams
        for team in teams:
            jerseys = sorted(
                Playerlist.objects.filter(team=team).values_list(
                    "jersey_number", flat=True
                )
            )
            assert jerseys == list(range(1, 11)), (team.name, jerseys)

    def test_reseeding_drops_players_an_older_seed_left_behind(self):
        call_command("seed_demo_data")
        team = _rostered_teams().first()
        stray_person = Person.objects.create(
            first_name="Stray", last_name="Player", sex=Person.MALE, year_of_birth=1999
        )
        stray = Playerlist.objects.create(
            team=team,
            player=Player.objects.create(person=stray_person, pass_number="999999"),
            jersey_number=44,
            joined_on=date.today(),
        )

        call_command("seed_demo_data")

        assert not Playerlist.objects.filter(pk=stray.pk).exists()
        assert Playerlist.objects.filter(team=team).count() == 10

    def test_every_roster_has_ten_unique_jerseys_per_side(
        self, client, django_user_model
    ):
        call_command("seed_demo_data")
        call_command("seed_demo_data")
        client.force_login(django_user_model.objects.create_user("roster-size"))

        for game in (
            Gameinfo.objects.filter(gameresult__team__isnull=False)
            .exclude(gameday__pk__in=FINALS_GAMEDAY_PKS)
            .distinct()
        ):
            rows = client.get(f"/api/game/{game.pk}/roster").json()
            for side in ("home", "away"):
                jerseys = [row["jersey"] for row in rows if row["side"] == side]
                assert sorted(jerseys) == list(range(1, 11)), (game.pk, side)

    def test_a_gameday_from_an_older_seed_still_gets_its_roster(
        self, client, django_user_model
    ):
        # The demo database keeps the gamedays its first seed dated; a later
        # seed must not give the players a join date after them.
        call_command("seed_demo_data")
        Gameday.objects.update(date=date(2024, 3, 1))
        Playerlist.objects.all().delete()
        call_command("seed_demo_data")
        client.force_login(django_user_model.objects.create_user("old-gameday"))

        game = (
            Gameinfo.objects.filter(gameresult__team__isnull=False)
            .exclude(gameday__pk__in=FINALS_GAMEDAY_PKS)
            .first()
        )
        rows = client.get(f"/api/game/{game.pk}/roster").json()
        assert len([row for row in rows if row["side"] == "home"]) == 10


@pytest.mark.django_db
class TestSeedDemoDataFinals:
    """The two real 2026 finals gamedays are seeded from an anonymised
    snapshot; their rosters come from the passcheck jersey numbers."""

    def test_seeds_both_finals_gamedays_with_their_games(self):
        call_command("seed_demo_data")

        for snapshot in FINALS_GAMEDAYS:
            gameday = Gameday.objects.get(pk=snapshot["pk"])
            assert gameday.name == snapshot["name"]
            assert gameday.date == date.today()
            games = Gameinfo.objects.filter(gameday=gameday)
            assert games.count() == len(snapshot["games"])
            assert set(games.values_list("pk", flat=True)) == {
                game["pk"] for game in snapshot["games"]
            }
            assert set(
                ResourceUrl.objects.filter(gameday=gameday).values_list(
                    "url", flat=True
                )
            ) == {resource["url"] for resource in snapshot["resource_urls"]}

    def test_both_finals_gamedays_are_in_the_scorecard_list(self, client):
        # The scorecard lists /api/gameday/list/, which only answers gamedays
        # dated today - that is why the finals are seeded on the reset day.
        call_command("seed_demo_data")

        gameday_ids = {row["id"] for row in client.get("/api/gameday/list/").json()}

        assert FINALS_GAMEDAY_PKS <= gameday_ids

    def test_finals_games_are_open_for_the_scorecard(self):
        # A game with status "beendet" is inert in the scorecard; the finals
        # have to start as open games so they can be tracked with the stream.
        call_command("seed_demo_data")

        for snapshot in FINALS_GAMEDAYS:
            for game_snapshot in snapshot["games"]:
                game = Gameinfo.objects.get(pk=game_snapshot["pk"])
                assert game.status == Gameinfo.STATUS_PUBLISHED
                assert game.gameStarted is None
                assert game.gameHalftime is None
                assert game.gameFinished is None
                for result in game.gameresult_set.all():
                    assert (result.fh, result.sh, result.pa) == (None, None, None)

    def test_scorecard_games_api_lists_every_finals_game(self, client):
        # The exact endpoint the scorecard's game list reads.
        call_command("seed_demo_data")

        for snapshot in FINALS_GAMEDAYS:
            rows = client.get(f"/api/gameday/{snapshot['pk']}/officials/*").json()
            by_id = {row["id"]: row for row in rows}
            for game_snapshot in snapshot["games"]:
                row = by_id[game_snapshot["pk"]]
                assert row["status"] == Gameinfo.STATUS_PUBLISHED
                assert row["passcheck"] is True

    def test_rosters_are_derived_from_the_passcheck_snapshot(self):
        call_command("seed_demo_data")

        for snapshot in FINALS_GAMEDAYS:
            gameday = Gameday.objects.get(pk=snapshot["pk"])
            for team_name, team_data in snapshot["teams"].items():
                expected_jerseys = {entry["jersey"] for entry in team_data["passcheck"]}
                playerlists = Playerlist.objects.filter(
                    team__name=team_name, left_on__isnull=True
                )
                assert (
                    set(playerlists.values_list("jersey_number", flat=True))
                    == expected_jerseys
                )

                checked_in = PlayerlistGameday.objects.filter(
                    gameday=gameday, playerlist__team__name=team_name
                )
                assert checked_in.count() == len(expected_jerseys)
                assert (
                    set(checked_in.values_list("gameday_jersey", flat=True))
                    == expected_jerseys
                )

    def test_finals_players_are_synthetic(self):
        call_command("seed_demo_data")

        expected_count = sum(
            len(team_data["passcheck"])
            for snapshot in FINALS_GAMEDAYS
            for team_data in snapshot["teams"].values()
        )
        players = Player.objects.filter(
            playerlist__team__name__in=FINALS_TEAM_NAMES
        ).distinct()

        assert players.count() == expected_count
        for player in players.select_related("person"):
            assert player.pass_number.startswith("88")
            assert 1990 <= player.person.year_of_birth <= 2001

    def test_reseeding_keeps_the_finals_rosters_stable(self):
        call_command("seed_demo_data")
        first = set(
            Playerlist.objects.filter(team__name__in=FINALS_TEAM_NAMES).values_list(
                "team__name", "jersey_number", "player__pass_number"
            )
        )

        call_command("seed_demo_data")

        second = set(
            Playerlist.objects.filter(team__name__in=FINALS_TEAM_NAMES).values_list(
                "team__name", "jersey_number", "player__pass_number"
            )
        )
        assert first
        assert first == second

    def test_finals_passcheck_verifications_are_seeded(self):
        call_command("seed_demo_data")

        expected_count = sum(len(snapshot["teams"]) for snapshot in FINALS_GAMEDAYS)
        assert (
            PasscheckVerification.objects.filter(
                gameday__pk__in=FINALS_GAMEDAY_PKS
            ).count()
            == expected_count
        )

    def test_both_sides_of_every_finals_game_expose_their_roster(
        self, client, django_user_model
    ):
        call_command("seed_demo_data")
        client.force_login(django_user_model.objects.create_user("finals-roster"))

        for snapshot in FINALS_GAMEDAYS:
            for game_snapshot in snapshot["games"]:
                rows = client.get(f"/api/game/{game_snapshot['pk']}/roster").json()
                for side in ("home", "away"):
                    team_name = game_snapshot[side]
                    expected = {
                        entry["jersey"]
                        for entry in snapshot["teams"][team_name]["passcheck"]
                    }
                    actual = {row["jersey"] for row in rows if row["side"] == side}
                    assert actual == expected, (game_snapshot["pk"], side)

    def test_finals_roster_names_a_jersey_uniquely(self, client, django_user_model):
        """The picker shows a surname under the number: it must not repeat.

        A whole team with one surname reads as "every number is the same
        player" — the field feedback on Walldorf vs Düsseldorf. The verified
        passcheck of the finals keeps serving names, so this test also proves
        the roster gate does not strip them.
        """
        call_command("seed_demo_data")
        client.force_login(django_user_model.objects.create_user("finals-names"))

        for snapshot in FINALS_GAMEDAYS:
            for game_snapshot in snapshot["games"]:
                rows = client.get(f"/api/game/{game_snapshot['pk']}/roster").json()
                for side in ("home", "away"):
                    names = [row["name"] for row in rows if row["side"] == side]
                    assert names, (game_snapshot["pk"], side)
                    assert len(names) == len(set(names)), (game_snapshot["pk"], side)
