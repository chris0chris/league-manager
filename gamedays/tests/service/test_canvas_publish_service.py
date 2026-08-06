from django.test import TestCase

from gamedays.models import Gameinfo, GamedayDesignerState
from gamedays.service.canvas_publish_service import CanvasPublishService
from gamedays.service.stage_category import StageCategory
from gamedays.tests.setup_factories.db_setup import DBSetup


def _state_data_with_one_game(stage_category="preliminary"):
    return {
        "nodes": [
            {
                "id": "field-1",
                "type": "field",
                "data": {"type": "field", "name": "Feld 1", "order": 0},
            },
            {
                "id": "stage-1",
                "type": "stage",
                "parentId": "field-1",
                "data": {
                    "type": "stage",
                    "name": "Liga",
                    "category": stage_category,
                    "stageType": "STANDARD",
                },
            },
            {
                "id": "game-1",
                "type": "game",
                "parentId": "stage-1",
                "data": {
                    "type": "game",
                    "standing": "Tabelle",
                    "startTime": "10:00",
                    "homeTeamId": None,
                    "awayTeamId": None,
                    "official": None,
                },
            },
        ],
        "globalTeams": [],
    }


class TestCanvasPublishServiceStageCategory(TestCase):
    def test_apply_persists_preliminary_category_from_stage_node(self):
        gameday = DBSetup().create_empty_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday, state_data=_state_data_with_one_game("preliminary")
        )

        CanvasPublishService(gameday).apply()

        gi = Gameinfo.objects.get(gameday=gameday)
        assert gi.stage == "Liga"
        assert gi.stage_category == StageCategory.PRELIMINARY

    def test_apply_persists_final_category_from_stage_node(self):
        gameday = DBSetup().create_empty_gameday()
        GamedayDesignerState.objects.create(
            gameday=gameday, state_data=_state_data_with_one_game("final")
        )

        CanvasPublishService(gameday).apply()

        gi = Gameinfo.objects.get(gameday=gameday)
        assert gi.stage_category == StageCategory.FINAL

    def test_apply_defaults_to_preliminary_when_stage_node_has_no_category(self):
        state_data = _state_data_with_one_game("preliminary")
        del state_data["nodes"][1]["data"]["category"]
        gameday = DBSetup().create_empty_gameday()
        GamedayDesignerState.objects.create(gameday=gameday, state_data=state_data)

        CanvasPublishService(gameday).apply()

        gi = Gameinfo.objects.get(gameday=gameday)
        assert gi.stage_category == StageCategory.PRELIMINARY
