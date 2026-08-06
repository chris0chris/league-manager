import copy
from io import StringIO

from django.core.management import call_command, CommandError
from django.test import TestCase

from gamedays.models import (
    Gameday,
    GamedayDesignerState,
    Gameinfo,
    Gameresult,
    Team,
)
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    TeamFactory,
)

MINIMAL_CANVAS_STATE = {
    "nodes": [
        {
            "id": "stage-1",
            "type": "stage",
            "parentId": "field-1",
            "data": {"name": "Vorrunde", "stageType": "GROUP", "order": 0},
        },
        {
            "id": "field-1",
            "type": "field",
            "parentId": None,
            "data": {"name": "Platz 1", "order": 0},
        },
        {
            "id": "game-aaaa-bbbb-cccc",
            "type": "game",
            "parentId": "stage-1",
            "data": {"standing": "VF 2", "startTime": "10:00"},
        },
        {
            "id": "game-dddd-eeee-ffff",
            "type": "game",
            "parentId": "stage-1",
            "data": {
                "standing": "Spiel 2",
                "startTime": "11:00",
                "official": {"type": "winner", "matchName": "VF 2"},
            },
        },
    ],
    "globalTeams": [],
}


class FixCrypticOfficialsTest(TestCase):
    def setUp(self):
        self.team = TeamFactory()
        self.gameday = GamedayFactory()
        self.cryptic_team = Team.objects.create(
            name="winner:game-aaaa-bbbb-cccc",
            description="winner:game-aaaa-bbbb-cccc",
            location="",
        )
        self.gameinfo = GameinfoFactory(
            gameday=self.gameday,
            officials=self.cryptic_team,
        )
        GamedayDesignerState.objects.create(
            gameday=self.gameday,
            state_data=copy.deepcopy(MINIMAL_CANVAS_STATE),
        )

    def _call(self, execute=False, gameday=None):
        out = StringIO()
        call_command(
            "fix_cryptic_officials",
            execute=execute,
            gameday=gameday,
            stdout=out,
        )
        return out.getvalue()

    def test_dry_run_does_not_change_team_name(self):
        self._call()
        self.cryptic_team.refresh_from_db()
        assert self.cryptic_team.name == "winner:game-aaaa-bbbb-cccc"

    def test_execute_renames_cryptic_team(self):
        self._call(execute=True)
        self.cryptic_team.refresh_from_db()
        assert self.cryptic_team.name == "Gewinner VF 2"

    def test_execute_prints_change_table(self):
        output = self._call(execute=True)
        assert "winner:game-aaaa-bbbb-cccc" in output
        assert "Gewinner VF 2" in output

    def test_no_cryptic_teams_found(self):
        self.cryptic_team.delete()
        output = self._call()
        assert "No cryptic official teams found" in output

    def test_scoped_to_single_gameday(self):
        gameday2 = GamedayFactory()
        cryptic2 = Team.objects.create(
            name="loser:game-xxxx-yyyy-zzzz",
            description="loser:game-xxxx-yyyy-zzzz",
            location="",
        )
        GameinfoFactory(gameday=gameday2, officials=cryptic2)
        GamedayDesignerState.objects.create(
            gameday=gameday2,
            state_data={
                "nodes": [
                    {
                        "id": "game-xxxx-yyyy-zzzz",
                        "type": "game",
                        "parentId": "stage-1",
                        "data": {"standing": "HF 1", "startTime": "10:00"},
                    },
                ],
                "globalTeams": [],
            },
        )

        # Scope to gameday1 — should only fix the first cryptic team
        self._call(execute=True, gameday=self.gameday.pk)

        self.cryptic_team.refresh_from_db()
        assert self.cryptic_team.name == "Gewinner VF 2"

        cryptic2.refresh_from_db()
        assert cryptic2.name == "loser:game-xxxx-yyyy-zzzz"

    def test_unresolvable_no_canvas_state(self):
        GamedayDesignerState.objects.filter(gameday=self.gameday).delete()
        output = self._call(execute=True)
        assert "Unresolvable" in output
        assert "No canvas state" in output
        # Team name should remain unchanged
        self.cryptic_team.refresh_from_db()
        assert self.cryptic_team.name == "winner:game-aaaa-bbbb-cccc"

    def test_unresolvable_uuid_not_in_canvas(self):
        # Replace canvas state with one that doesn't contain the UUID
        GamedayDesignerState.objects.filter(gameday=self.gameday).update(
            state_data={"nodes": [], "globalTeams": []},
        )
        output = self._call(execute=True)
        assert "Unresolvable" in output
        assert "not found in canvas" in output
