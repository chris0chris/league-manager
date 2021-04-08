import pathlib

import pandas as pd
from django.test import TestCase
from pandas.testing import assert_frame_equal

from gamedays.service.model_wrapper import GamedayModelWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo


def get_df_from_json(filename):
    return pd.read_json(pathlib.Path(__file__).parent / 'testdata/{0}.json'.format(filename),
                        orient='table')


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
        expected_schedule = get_df_from_json('schedule_g62_qualify_finished')
        schedule = GamedayModelWrapper(gameday.pk).get_schedule()
        del expected_schedule['scheduled']
        del schedule['scheduled']
        assert schedule.to_json() == expected_schedule.to_json()

    def test_empty_get_qualify_table(self):
        gameday = DBSetup().create_main_round_gameday()
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_qualify_table() == ''

    def test_get_qualify_table(self):
        gameday = DBSetup().g62_qualify_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        expected_qualify_table = get_df_from_json('ts_qualify_table')
        assert_frame_equal(gmw.get_qualify_table(), expected_qualify_table, check_dtype=False)

    def test_empty_get_final_table(self):
        gameday = DBSetup().g62_qualify_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_final_table().empty

    def test_get_final_table(self):
        gameday = DBSetup().g62_finalround(sf='beendet', p5='beendet', p3='beendet', p1='beendet')
        expected_final_table = get_df_from_json('ts_final_table_6_teams')
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_final_table().to_json() == expected_final_table.to_json()

    def test_get_final_table_for_7_teams(self):
        gameday = DBSetup().g72_finished()
        expected_table = get_df_from_json('ts_final_table_7_teams')
        gmw = GamedayModelWrapper(gameday.pk)
        assert_frame_equal(gmw.get_final_table(), expected_table, check_dtype=False)

    def test_get_final_table_for_main_round(self):
        gameday = DBSetup().create_main_round_gameday(status='beendet', number_teams=4)
        expected_table = get_df_from_json('ts_final_table_4_teams')
        gmw = GamedayModelWrapper(gameday.pk)
        assert_frame_equal(gmw.get_final_table(), expected_table, check_dtype=False)

    def test_get_qualify_team_by(self):
        gameday = DBSetup().g62_qualify_finished()
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_qualify_team_by(place=1, standing='Gruppe 1') == 'A1'
        assert gmw.get_qualify_team_by(place=3, standing='Gruppe 2') == 'B3'

    def test_get_team_by_points(self):
        gameday = DBSetup().g62_finalround(sf='beendet')
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_team_by_points(place=1, standing='HF', points=0) == 'B2'
        assert gmw.get_team_by_points(place=1, standing='HF', points=3) == 'A1'
        assert gmw.get_team_by_points(place=2, standing='HF', points=0) == 'A2'
        assert gmw.get_team_by_points(place=2, standing='HF', points=3) == 'B1'

    def test_get_team_by(self):
        gameday = DBSetup().g62_finalround(sf='beendet')
        gmw = GamedayModelWrapper(gameday.pk)
        assert gmw.get_team_by(place=1, standing='HF', points=3) == 'A1'
        assert gmw.get_team_by(place=1, standing='Gruppe 1') == 'A1'

    def test_is_finished(self):
        gameday = DBSetup().g62_qualify_finished()
        Gameinfo.objects.filter(standing='P1').update(status='beendet')

        gmw = GamedayModelWrapper(gameday.pk)

        assert gmw.is_finished('Vorrunde')
        assert not gmw.is_finished('HF')
        assert gmw.is_finished('P1')

    def test_is_not_finished(self):
        gameday = DBSetup().g62_qualify_finished()
        Gameinfo.objects.filter(standing='Gruppe 1').update(status='some_state')
        Gameinfo.objects.filter(standing='HF').update(status='beendet')

        gmw = GamedayModelWrapper(gameday.pk)
        assert not gmw.is_finished('Vorrunde')
        assert gmw.is_finished('HF')

    def test_get_games_to_whistle(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(id=1).update(gameFinished='12:00')
        gmw = GamedayModelWrapper(gameday.pk)
        assert len(gmw.get_games_to_whistle('officials').index) == 5

    def test_get_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(id=1).update(gameFinished='12:00')
        Gameinfo.objects.filter(id=2).update(officials=2)
        gmw = GamedayModelWrapper(gameday.pk)
        assert len(gmw.get_games_to_whistle('').index) == 10
