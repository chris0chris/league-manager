import pathlib

import pandas as pd
from django.test import TestCase

from gamedays.models import Team, Gameinfo, Gameresult
from gamedays.service.gameday_settings import (
    SCHEDULED,
    FIELD,
    HOME,
    POINTS_HOME,
    POINTS_AWAY,
    AWAY,
    OFFICIALS_NAME,
    STANDING,
    STAGE,
    STATUS,
)
from gamedays.service.model_wrapper import GamedayModelWrapper
from gamedays.tests.setup_factories.dataframe_setup import DataFrameAssertion
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayModelWrapper(TestCase):

    def test_no_gameinfos_for_gameday(self):
        gameday = DBSetup().create_empty_gameday()
        with self.assertRaises(Gameinfo.DoesNotExist):
            GamedayModelWrapper(gameday.pk)

    def test_has_finalround(self):
        gameday_with_finalround = DBSetup().g62_finalround()
        gameday_with_main_round = DBSetup().create_main_round_gameday()
        gmw = GamedayModelWrapper(gameday_with_finalround.pk)
        assert gmw.has_finalround()

        gmw = GamedayModelWrapper(gameday_with_main_round.pk)
        assert not gmw.has_finalround()

    def test_get_schedule(self):
        gameday = DBSetup().g62_qualify_finished()
        expected_schedule = pd.read_json(
            pathlib.Path(__file__).parent
            / "testdata/schedule_g62_qualify_finished.json",
            orient="table",
        )
        schedule = GamedayModelWrapper(gameday.pk).get_schedule()
        columns = [
            SCHEDULED,
            FIELD,
            HOME,
            POINTS_HOME,
            POINTS_AWAY,
            AWAY,
            OFFICIALS_NAME,
            STANDING,
            STAGE,
            STATUS,
        ]
        schedule = schedule[columns]
        expected_schedule = expected_schedule[columns]
        assert schedule.to_json() == expected_schedule.to_json()

    def test_empty_get_qualify_table(self):
        gameday = DBSetup().create_main_round_gameday()
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_qualify_table() == ""

    def test_get_qualify_table(self):
        gameday = DBSetup().g62_qualify_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        DataFrameAssertion.expect(gmw.get_qualify_table()).to_equal_json(
            "ts_qualify_table"
        )

    def test_empty_get_final_table(self):
        gameday = DBSetup().g62_qualify_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_final_table().empty

    def test_get_final_table(self):
        gameday = DBSetup().g62_finalround(
            sf="beendet", p5="beendet", p3="beendet", p1="beendet"
        )
        gmw = GamedayModelWrapper(gameday.pk)
        DataFrameAssertion.expect(gmw.get_final_table()).to_equal_json(
            "ts_final_table_6_teams"
        )

    def test_get_final_table_for_7_teams(self):
        gameday = DBSetup().g72_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        DataFrameAssertion.expect(gmw.get_final_table()).to_equal_json(
            "ts_final_table_7_teams"
        )

    def test_get_final_table_for_main_round(self):
        gameday = DBSetup().create_main_round_gameday(status="beendet", number_teams=4)
        gmw = GamedayModelWrapper(gameday.pk)
        DataFrameAssertion.expect(gmw.get_final_table()).to_equal_json(
            "ts_final_table_4_teams"
        )

    def test_get_qualify_team_by(self):
        gameday = DBSetup().g62_qualify_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_qualify_team_by(place=1, standing="Gruppe 1") == "A1"
        assert gmw.get_qualify_team_by(place=3, standing="Gruppe 2") == "B3"

    def test_get_team_by_points(self):
        gameday = DBSetup().g62_finalround(sf="beendet")
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_team_by_points(place=1, standing="HF", points=0) == "B2"
        assert gmw.get_team_by_points(place=1, standing="HF", points=2) == "A1"
        assert gmw.get_team_by_points(place=2, standing="HF", points=0) == "A2"
        assert gmw.get_team_by_points(place=2, standing="HF", points=2) == "B1"

    def test_get_team_by(self):
        gameday = DBSetup().g62_finalround(sf="beendet")
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_team_by(place=1, standing="HF", points=2) == "A1"
        assert gmw.get_team_by(place=1, standing="Gruppe 1") == "A1"

    def test_is_finished(self):
        gameday = DBSetup().g62_qualify_finished()
        Gameinfo.objects.filter(standing="P1").update(status="beendet")

        gmw = GamedayModelWrapper(gameday.pk)

        assert gmw.is_finished("Vorrunde")
        assert not gmw.is_finished("HF")
        assert gmw.is_finished("P1")

    def test_is_not_finished(self):
        gameday = DBSetup().g62_qualify_finished()
        Gameinfo.objects.filter(standing="Gruppe 1").update(status="some_state")
        Gameinfo.objects.filter(standing="HF").update(status="beendet")

        gmw = GamedayModelWrapper(gameday.pk)
        assert not gmw.is_finished("Vorrunde")
        assert gmw.is_finished("HF")

    def test_get_games_to_whistle(self):
        gameday = DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        Gameinfo.objects.filter(id=first_game.pk).update(gameFinished="12:00")
        gmw = GamedayModelWrapper(gameday.pk)
        assert len(gmw.get_games_to_whistle("officials").index) == 5

    def test_get_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        first_team = Team.objects.first()
        Gameinfo.objects.filter(id=first_game.pk).update(gameFinished="12:00")
        Gameinfo.objects.filter(id=first_game.pk + 1).update(
            officials=first_team.pk + 1
        )
        gmw = GamedayModelWrapper(gameday.pk)
        assert len(gmw.get_games_to_whistle("").index) == 10

    def test_get_all_second_places_for_prelim(self):
        gameday = DBSetup().g62_qualify_finished()
        all_prelim_games = Gameinfo.objects.filter(gameday=gameday)
        for game in all_prelim_games:
            update_gameresults(game)
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_team_by_qualify_for(place=2, index=0) == "B2"
        assert gmw.get_team_by_qualify_for(place=2, index=1) == "A2"

    def test_team_aggregation(self):
        gameday = DBSetup().g72_qualify_finished()
        all_games = Gameinfo.objects.filter(gameday=gameday)
        for game in all_games:
            update_gameresults(game)
        gmw = GamedayModelWrapper(gameday.pk)
        assert (
            gmw.get_team_aggregate_by(
                aggregate_standings=["Gruppe 1", "Gruppe 2"], aggregate_place=2, place=1
            )
            == "A3"
        )
        assert (
            gmw.get_team_aggregate_by(
                aggregate_standings=["Gruppe 1", "Gruppe 2"], aggregate_place=2, place=2
            )
            == "B2"
        )

    def test_get_mulitple_teams_by_standing_and_points(self):
        gameday = DBSetup().g72_qualify_finished()
        all_games = Gameinfo.objects.filter(gameday=gameday)
        for game in all_games:
            update_gameresults(game)
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_teams_by(standing="HF", points=2) == ["B2", "B1"]


def update_gameresults(game):
    results = Gameresult.objects.filter(gameinfo=game)
    assert results.count() == 2
    result_1: Gameresult = results[0]
    result_2: Gameresult = results[1]
    result_1.fh = result_1.team.pk
    result_1.sh = result_1.team.pk
    result_1.pa = 2 * result_2.team.pk
    result_1.save()
    result_2.fh = result_2.team.pk
    result_2.sh = result_2.team.pk
    result_2.pa = 2 * result_1.team.pk
    result_2.save()
