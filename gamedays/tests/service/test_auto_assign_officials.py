from django.contrib.auth.models import User
from django.test import TestCase

from gamedays.models import (
    Gameday,
    GamedayDesignerState,
    Gameinfo,
    Gameresult,
    Season,
    League,
    Team,
)
from gamedays.service.auto_assign_officials_service import (
    AutoAssignOfficialsError,
    AutoAssignOfficialsService,
)
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestAutoAssignOfficialsService(TestCase):
    """Service-level tests for AutoAssignOfficialsService."""

    def setUp(self):
        self.user = User.objects.create_superuser(
            username="admin", password="password", email="admin@test.com"
        )

    def _get_team_ids_for_game(self, gi: Gameinfo) -> list[int]:
        return [gr.team_id for gr in Gameresult.objects.filter(gameinfo=gi)]

    def _assert_no_self_referee(self, gameday: Gameday):
        for gi in Gameinfo.objects.filter(gameday=gameday).prefetch_related(
            "gameresult_set"
        ):
            playing_ids = {gr.team_id for gr in gi.gameresult_set.all()}
            assert (
                gi.officials_id not in playing_ids
            ), f"Game {gi.pk}: team {gi.officials_id} is playing and refereeing"

    def _assert_no_time_conflict(self, gameday: Gameday):
        games_at_time: dict[str, list[Gameinfo]] = {}
        for gi in Gameinfo.objects.filter(gameday=gameday).prefetch_related(
            "gameresult_set"
        ):
            key = gi.scheduled.isoformat()
            games_at_time.setdefault(key, []).append(gi)
        for scheduled, gis in games_at_time.items():
            all_busy = set()
            for gi in gis:
                for gr in gi.gameresult_set.all():
                    if gr.team_id:
                        all_busy.add(gr.team_id)
            for gi in gis:
                if gi.officials_id in all_busy:
                    playing_for = [gr.team_id for gr in gi.gameresult_set.all()]
                    if gi.officials_id in playing_for:
                        continue
                    self.fail(
                        f"Game {gi.pk} at {scheduled}: team {gi.officials_id} "
                        f"is refereeing but is playing in another game at same time"
                    )

    def _assert_balanced_referee_counts(self, gameday: Gameday):
        counts: dict[int, int] = {}
        for gi in Gameinfo.objects.filter(gameday=gameday):
            if gi.officials_id:
                counts[gi.officials_id] = counts.get(gi.officials_id, 0) + 1
        if not counts:
            return
        values = list(counts.values())
        assert max(values) - min(values) <= 1, f"Referee counts imbalanced: {counts}"

    def test_cross_group_2x3_balanced(self):
        gameday = DBSetup().g62_status_empty()
        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert len(assignments) == Gameinfo.objects.filter(gameday=gameday).count()
        self._assert_no_self_referee(gameday)
        self._assert_no_time_conflict(gameday)
        self._assert_balanced_referee_counts(gameday)

    def test_cross_group_2x4_balanced(self):
        gameday = DBSetup().g72_qualify_finished()
        gameday.status = "DRAFT"
        gameday.save()

        Gameinfo.objects.filter(gameday=gameday).exclude(
            stage__in=("Vorrunde",)
        ).delete()

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        self._assert_no_self_referee(gameday)
        self._assert_no_time_conflict(gameday)
        self._assert_balanced_referee_counts(gameday)

    def test_time_conflict_avoidance(self):
        gameday = DBSetup().g62_status_empty()
        service = AutoAssignOfficialsService(gameday.pk)
        service.assign()
        self._assert_no_time_conflict(gameday)

    def test_same_group_fallback(self):
        season = Season.objects.create(name="2026")
        league = League.objects.create(name="Test")
        gameday = Gameday.objects.create(
            name="Single Group",
            season=season,
            league=league,
            date="2026-07-16",
            start="10:00",
            author=self.user,
            status="DRAFT",
            format="3_1",
        )
        teams = [
            Team.objects.create(name=f"Team {i}", description=f"T{i}") for i in range(3)
        ]
        games_data = [
            ("10:00", teams[0], teams[1]),
            ("11:10", teams[2], teams[0]),
            ("12:20", teams[1], teams[2]),
        ]
        for i, (time, home, away) in enumerate(games_data, 1):
            gi = Gameinfo.objects.create(
                gameday=gameday,
                scheduled=time,
                field=1,
                stage="Vorrunde",
                standing="Gruppe 1",
                status="Geplant",
                officials=home,
            )
            Gameresult.objects.create(gameinfo=gi, team=home, isHome=True)
            Gameresult.objects.create(gameinfo=gi, team=away, isHome=False)

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert len(assignments) == 3
        self._assert_no_self_referee(gameday)
        self._assert_no_time_conflict(gameday)
        self._assert_balanced_referee_counts(gameday)

    def test_single_group_four_teams_one_field(self):
        """4 teams on 1 field, single standing -- each game at a different
        time, so eligible teams should always exist."""
        gameday = Gameday.objects.create(
            name="4 Teams 1 Field",
            season=Season.objects.create(name="2026"),
            league=League.objects.create(name="Test"),
            date="2026-07-16",
            start="10:00",
            author=self.user,
            status="DRAFT",
            format="4_1",
        )
        teams = [Team.objects.create(name=f"Team {i}", description=f"T{i}") for i in range(4)]
        games_data = [
            ("10:00", 0, 1),
            ("11:10", 2, 3),
            ("12:20", 0, 2),
            ("13:30", 1, 3),
            ("14:40", 0, 3),
            ("15:50", 1, 2),
        ]
        for time, h, a in games_data:
            gi = Gameinfo.objects.create(
                gameday=gameday,
                scheduled=time,
                field=1,
                stage="Vorrunde",
                standing="Gruppe 1",
                status="Geplant",
                officials=teams[h],
            )
            Gameresult.objects.create(gameinfo=gi, team=teams[h], isHome=True)
            Gameresult.objects.create(gameinfo=gi, team=teams[a], isHome=False)

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert len(assignments) == 6
        self._assert_no_self_referee(gameday)
        self._assert_no_time_conflict(gameday)
        self._assert_balanced_referee_counts(gameday)

    def test_non_draft_status_rejected(self):
        gameday = DBSetup().create_empty_gameday()
        gameday.status = "PUBLISHED"
        gameday.save()
        service = AutoAssignOfficialsService(gameday.pk)
        with self.assertRaises(AutoAssignOfficialsError):
            service.assign()

    def test_empty_gameday_returns_empty(self):
        gameday = DBSetup().create_empty_gameday()
        Gameinfo.objects.filter(gameday=gameday).delete()
        service = AutoAssignOfficialsService(gameday.pk)
        assert service.assign() == {}

    def test_existing_officials_overwritten(self):
        gameday = DBSetup().g62_status_empty()
        wrong_team = Team.objects.create(name="Wrong", description="Wrong")
        Gameinfo.objects.filter(gameday=gameday).update(officials=wrong_team)

        service = AutoAssignOfficialsService(gameday.pk)
        service.assign()

        for gi in Gameinfo.objects.filter(gameday=gameday):
            assert (
                gi.officials_id != wrong_team.pk
            ), f"Game {gi.pk} still has wrong official"

    def test_assignments_are_deterministic(self):
        gameday = DBSetup().g62_status_empty()
        service = AutoAssignOfficialsService(gameday.pk)
        a1 = service.assign()
        a2 = service.assign()

        assert a1 == a2, "Assignments differ between runs"


class TestAutoAssignOfficialsServiceDesignerState(TestCase):
    """
    Covers gamedays that have never been published: games only exist as
    JSON nodes in GamedayDesignerState.state_data, not as Gameinfo rows
    (those are only materialized by CanvasPublishService at publish time).
    """

    def setUp(self):
        self.user = User.objects.create_superuser(
            username="admin2", password="password", email="admin2@test.com"
        )
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")

    def _create_draft_gameday(self) -> Gameday:
        return Gameday.objects.create(
            name="Unpublished Draft",
            season=self.season,
            league=self.league,
            date="2026-07-16",
            start="10:00",
            author=self.user,
            status="DRAFT",
            format="3_1",
        )

    def _game_node(
        self,
        node_id,
        standing,
        home_id,
        away_id,
        parent_id="stage-1",
        start_time=None,
        manual_time=False,
    ):
        data = {
            "type": "game",
            "stage": "Preliminary",
            "stageType": "STANDARD",
            "standing": standing,
            "fieldId": None,
            "official": None,
            "breakAfter": 0,
            "homeTeamId": home_id,
            "awayTeamId": away_id,
            "homeTeamDynamic": None,
            "awayTeamDynamic": None,
            "duration": 70,
            "manualTime": manual_time,
        }
        if start_time is not None:
            data["startTime"] = start_time
        return {
            "id": node_id,
            "type": "game",
            "parentId": parent_id,
            "data": data,
        }

    def test_idle_team_in_pool_is_assigned_as_referee(self):
        """Reproduces the reported bug: 3 registered teams, 1 game between
        2 of them -- the 3rd, idle team should be assigned as referee."""
        gameday = self._create_draft_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [self._game_node("game-1", "Game 1", "team-a", "team-b")],
                "globalTeams": [
                    {"id": "team-a", "label": "A", "groupId": "group-1", "order": 0},
                    {"id": "team-b", "label": "B", "groupId": "group-1", "order": 0},
                    {"id": "team-c", "label": "C", "groupId": "group-1", "order": 0},
                ],
                "globalTeamGroups": [{"id": "group-1", "name": "Group 1", "order": 0}],
            },
        )

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert assignments == {"game-1": "team-c"}

        state = GamedayDesignerState.objects.get(gameday=gameday)
        node = state.state_data["nodes"][0]
        assert node["data"]["official"] == {"type": "static", "name": "team-c"}

    def test_no_eligible_team_skips_game(self):
        """Only the two playing teams are registered -- nobody is free to
        referee, so the game is left unassigned rather than crashing."""
        gameday = self._create_draft_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [self._game_node("game-1", "Game 1", "team-a", "team-b")],
                "globalTeams": [
                    {"id": "team-a", "label": "A", "groupId": "group-1", "order": 0},
                    {"id": "team-b", "label": "B", "groupId": "group-1", "order": 0},
                ],
                "globalTeamGroups": [{"id": "group-1", "name": "Group 1", "order": 0}],
            },
        )

        service = AutoAssignOfficialsService(gameday.pk)
        assert service.assign() == {}

    def test_four_teams_one_field_designer_state(self):
        """4 teams on 1 field in designer state (no manual times). All games
        share the same stage-based time key, which previously caused all teams
        to appear busy and 0 assignments."""
        gameday = self._create_draft_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    self._game_node("game-1", "Game 1", "team-a", "team-b"),
                    self._game_node("game-2", "Game 2", "team-c", "team-d"),
                    self._game_node("game-3", "Game 3", "team-a", "team-c"),
                    self._game_node("game-4", "Game 4", "team-b", "team-d"),
                    self._game_node("game-5", "Game 5", "team-a", "team-d"),
                    self._game_node("game-6", "Game 6", "team-b", "team-c"),
                ],
                "globalTeams": [
                    {"id": t, "label": t, "groupId": "group-1", "order": 0}
                    for t in ("team-a", "team-b", "team-c", "team-d")
                ],
                "globalTeamGroups": [{"id": "group-1", "name": "Group 1", "order": 0}],
            },
        )

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert len(assignments) == 6, f"Expected 6 assignments, got {len(assignments)}: {assignments}"

        state = GamedayDesignerState.objects.get(gameday=gameday)
        ref_counts: dict[str, int] = {}
        for node in state.state_data["nodes"]:
            official = node["data"].get("official", {})
            if official and official.get("name"):
                ref_counts[official["name"]] = ref_counts.get(official["name"], 0) + 1

        assert len(ref_counts) > 0, "No referees were assigned"
        values = list(ref_counts.values())
        assert max(values) - min(values) <= 1, f"Referee counts imbalanced: {ref_counts}"

    def test_four_teams_two_fields_designer_state_skips_when_impossible(self):
        """4 teams on 2 fields in designer state — games are concurrent
        across fields, all teams are busy simultaneously, so no assignment
        is possible (and the fallback for a single field must NOT trigger)."""
        gameday = Gameday.objects.create(
            name="4 Teams 2 Fields",
            season=self.season,
            league=self.league,
            date="2026-07-16",
            start="10:00",
            author=self.user,
            status="DRAFT",
            format="4_2",
        )
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    self._game_node("game-1", "Game 1", "team-a", "team-b"),
                    self._game_node("game-2", "Game 2", "team-c", "team-d"),
                ],
                "globalTeams": [
                    {"id": t, "label": t, "groupId": "group-1", "order": 0}
                    for t in ("team-a", "team-b", "team-c", "team-d")
                ],
                "globalTeamGroups": [{"id": "group-1", "name": "Group 1", "order": 0}],
            },
        )

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert assignments == {}, (
            f"Expected 0 assignments (all teams busy concurrently), "
            f"got {len(assignments)}: {assignments}"
        )

    def test_no_designer_state_returns_empty(self):
        gameday = self._create_draft_gameday()
        service = AutoAssignOfficialsService(gameday.pk)
        assert service.assign() == {}

    def test_no_game_nodes_returns_empty(self):
        gameday = self._create_draft_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={"nodes": [], "globalTeams": [], "globalTeamGroups": []},
        )
        service = AutoAssignOfficialsService(gameday.pk)
        assert service.assign() == {}

    def test_cross_group_prefers_donor_not_yet_playing_over_widened_pool(self):
        """With two standings, a team already playing in the other standing
        is preferred over falling back to the full pool."""
        gameday = self._create_draft_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    self._game_node("game-1", "Game 1", "team-a", "team-b"),
                    self._game_node(
                        "game-2",
                        "Game 2",
                        "team-c",
                        "team-d",
                        start_time="11:00",
                        manual_time=True,
                    ),
                ],
                "globalTeams": [
                    {"id": t, "label": t, "groupId": "group-1", "order": 0}
                    for t in ("team-a", "team-b", "team-c", "team-d")
                ],
                "globalTeamGroups": [{"id": "group-1", "name": "Group 1", "order": 0}],
            },
        )

        service = AutoAssignOfficialsService(gameday.pk)
        assignments = service.assign()

        assert set(assignments.keys()) == {"game-1", "game-2"}
        # Game 1 (stage default time) draws from Game 2's teams (not busy then)
        assert assignments["game-1"] in {"team-c", "team-d"}
        # Game 2 has an explicit later time, so Game 1's teams are free too
        assert assignments["game-2"] in {"team-a", "team-b"}
