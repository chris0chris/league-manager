import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from gamedays.models import Gameday, Gameinfo, Gameresult, GamedayDesignerState, Season, League

MINIMAL_CANVAS_STATE = {
    "globalTeams": [
        {"id": "t1", "label": "Team Alpha", "groupId": None, "order": 0},
        {"id": "t2", "label": "Team Beta",  "groupId": None, "order": 1},
        {"id": "t3", "label": "Officials FC", "groupId": None, "order": 2},
    ],
    "globalTeamGroups": [],
    "nodes": [
        # Field container — order is 0-based (first field = 0)
        {
            "id": "field-1",
            "type": "field",
            "parentId": None,
            "data": {"type": "field", "name": "Field 1", "order": 0},
            "position": {"x": 0, "y": 0},
        },
        # Stage container
        {
            "id": "stage-1",
            "type": "stage",
            "parentId": "field-1",
            "data": {"type": "stage", "name": "Vorrunde", "category": "preliminary"},
            "position": {"x": 0, "y": 0},
        },
        # Game node
        {
            "id": "game-1",
            "type": "game",
            "parentId": "stage-1",
            "data": {
                "type": "game",
                "stage": "Vorrunde",
                "standing": "Gruppe 1",
                "startTime": "10:00",
                "homeTeamId": "t1",
                "awayTeamId": "t2",
                "homeTeamDynamic": None,
                "awayTeamDynamic": None,
                "official": {"type": "static", "name": "t3"},
            },
            "position": {"x": 0, "y": 0},
        },
    ],
    "edges": [],
}

PROGRESSION_CANVAS_STATE = {
    "globalTeams": [
        {"id": "t1", "label": "Team Alpha", "groupId": None, "order": 0},
        {"id": "t2", "label": "Team Beta",  "groupId": None, "order": 1},
    ],
    "globalTeamGroups": [],
    "nodes": [
        {
            "id": "field-1", "type": "field", "parentId": None,
            "data": {"type": "field", "name": "Field 1", "order": 0},
            "position": {"x": 0, "y": 0},
        },
        {
            "id": "stage-1", "type": "stage", "parentId": "field-1",
            "data": {"type": "stage", "name": "Vorrunde", "category": "preliminary"},
            "position": {"x": 0, "y": 0},
        },
        # Preliminary game – has real teams
        {
            "id": "game-prelim", "type": "game", "parentId": "stage-1",
            "data": {
                "type": "game", "stage": "Vorrunde", "standing": "Game A1",
                "startTime": "10:00", "homeTeamId": "t1", "awayTeamId": "t2",
                "homeTeamDynamic": None, "awayTeamDynamic": None, "official": None,
            },
            "position": {"x": 0, "y": 0},
        },
        {
            "id": "stage-2", "type": "stage", "parentId": "field-1",
            "data": {"type": "stage", "name": "Finale", "category": "final"},
            "position": {"x": 0, "y": 0},
        },
        # Playoff game – teams resolved dynamically after prelim completes
        {
            "id": "game-sf1", "type": "game", "parentId": "stage-2",
            "data": {
                "type": "game", "stage": "Finale", "standing": "SF1",
                "startTime": "12:00", "homeTeamId": None, "awayTeamId": None,
                "homeTeamDynamic": {"type": "winner", "matchName": "Game A1"},
                "awayTeamDynamic": {"type": "loser",  "matchName": "Game A1"},
                "official": None,
            },
            "position": {"x": 0, "y": 0},
        },
    ],
    "edges": [],
}


@pytest.mark.django_db
class TestPublishCreatesGameinfos:
    def setup_method(self):
        self.user = User.objects.create_superuser("pub_test", password="pw")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        season = Season.objects.create(name="2026")
        league = League.objects.create(name="Test League")
        self.gameday = Gameday.objects.create(
            name="Test Day",
            season=season,
            league=league,
            date="2026-03-15",
            start="10:00",
            status=Gameday.STATUS_DRAFT,
            author=self.user,
        )

    def _publish(self):
        return self.client.post(f"/api/gamedays/{self.gameday.id}/publish/")

    def test_publish_without_designer_state_creates_no_gameinfos(self):
        response = self._publish()
        assert response.status_code == 200
        assert Gameinfo.objects.filter(gameday=self.gameday).count() == 0

    def test_publish_with_canvas_state_creates_gameinfos(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=MINIMAL_CANVAS_STATE
        )
        response = self._publish()
        assert response.status_code == 200
        assert Gameinfo.objects.filter(gameday=self.gameday).count() == 1

    def test_publish_sets_gameinfo_fields_from_canvas(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=MINIMAL_CANVAS_STATE
        )
        self._publish()
        gi = Gameinfo.objects.get(gameday=self.gameday)
        assert str(gi.scheduled) == "10:00:00"
        assert gi.field == 1   # order=0 → field=1 (1-based)
        assert gi.stage == "Vorrunde"
        assert gi.standing == "Gruppe 1"

    def test_publish_creates_gameresults_for_home_and_away(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=MINIMAL_CANVAS_STATE
        )
        self._publish()
        gi = Gameinfo.objects.get(gameday=self.gameday)
        results = Gameresult.objects.filter(gameinfo=gi).order_by("isHome")
        assert results.count() == 2
        away = results.get(isHome=False)
        home = results.get(isHome=True)
        assert home.team.name == "Team Alpha"
        assert away.team.name == "Team Beta"

    def test_publish_official_resolved_from_global_team_label(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=MINIMAL_CANVAS_STATE
        )
        self._publish()
        gi = Gameinfo.objects.get(gameday=self.gameday)
        assert gi.officials.name == "Officials FC"   # NOT the "t3" UUID

    def test_republish_after_unlock_replaces_gameinfos(self):
        """
        Full unlock → edit → re-publish cycle:
        1. Publish with canvas state A (standing "Gruppe 1")
        2. Unlock via PATCH status → DRAFT
        3. Update canvas state to standing "Gruppe 2"
        4. Publish again → old Gameinfo deleted, new one created with updated standing
        """
        import copy

        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=MINIMAL_CANVAS_STATE
        )

        # First publish
        resp = self._publish()
        assert resp.status_code == 200
        assert Gameinfo.objects.filter(gameday=self.gameday).count() == 1
        assert Gameinfo.objects.get(gameday=self.gameday).standing == "Gruppe 1"

        # Unlock via PATCH (mirrors gamedayApi.patchGameday call in the frontend)
        unlock_resp = self.client.patch(
            f"/api/gamedays/{self.gameday.id}/",
            {"status": "DRAFT"},
            format="json",
        )
        assert unlock_resp.status_code == 200
        self.gameday.refresh_from_db()
        assert self.gameday.status == Gameday.STATUS_DRAFT

        # Edit the canvas: change standing to "Gruppe 2"
        updated_state = copy.deepcopy(MINIMAL_CANVAS_STATE)
        updated_state["nodes"][-1]["data"]["standing"] = "Gruppe 2"
        state = GamedayDesignerState.objects.get(gameday=self.gameday)
        state.state_data = updated_state
        state.save()

        # Second publish
        resp2 = self._publish()
        assert resp2.status_code == 200
        assert Gameinfo.objects.filter(gameday=self.gameday).count() == 1
        gi = Gameinfo.objects.get(gameday=self.gameday)
        assert gi.standing == "Gruppe 2"

    def test_publish_playoff_game_has_no_team_initially(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=PROGRESSION_CANVAS_STATE
        )
        self._publish()
        sf1 = Gameinfo.objects.get(gameday=self.gameday, standing="SF1")
        assert Gameresult.objects.filter(gameinfo=sf1, team__isnull=False).count() == 0

    def test_progression_resolves_team_after_game_completes(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data=PROGRESSION_CANVAS_STATE
        )
        self._publish()

        prelim = Gameinfo.objects.get(gameday=self.gameday, standing="Game A1")
        # Enter final score: Alpha 7, Beta 0
        resp = self.client.patch(
            f"/api/gameinfo/{prelim.id}/result/",
            {"final_score": {"home": 7, "away": 0}},
            format="json",
        )
        assert resp.status_code == 200

        sf1 = Gameinfo.objects.get(gameday=self.gameday, standing="SF1")
        home_result = Gameresult.objects.get(gameinfo=sf1, isHome=True)
        away_result = Gameresult.objects.get(gameinfo=sf1, isHome=False)
        assert home_result.team.name == "Team Alpha"   # winner
        assert away_result.team.name == "Team Beta"    # loser
