import pandas as pd
import pytest
from gamedays.service.gameday_service import (
    EmptyOffenseStatisticTable,
    EmptyDefenseStatisticTable,
    EmptyGamedayService,
    EmptySplitScoreTable,
    EmptyEventsTable,
    EmptySchedule,
    EmptyQualifyTable,
    EmptyFinalTable,
    GamedayGameService,
)


class TestGamedayServiceCoverage:
    def test_empty_tables_to_json(self):
        assert EmptyOffenseStatisticTable.to_json() == "[]"
        assert EmptyDefenseStatisticTable.to_json() == "[]"
        assert EmptySplitScoreTable.to_json() == "[]"
        assert EmptyEventsTable.to_json() == "[]"

    @pytest.mark.django_db
    def test_empty_gameday_service_methods(self):
        assert EmptyGamedayService.get_games_to_whistle() == EmptySchedule
        assert EmptyGamedayService.get_schedule() == EmptySchedule
        assert EmptyGamedayService.get_qualify_table() == EmptyQualifyTable
        assert EmptyGamedayService.get_final_table() == EmptyFinalTable

    def test_gameday_game_service_format_helpers(self):
        # Line 428: Extra point value 0
        row = pd.Series({"event": "1-Extra-Punkt", "value": 0})
        assert (
            GamedayGameService._format_event_with_player(row) == "<s>1-Extra-Punkt</s>"
        )

        # Line 450: format_time_string no colon
        assert GamedayGameService._format_time_string("1000") == "1000"
