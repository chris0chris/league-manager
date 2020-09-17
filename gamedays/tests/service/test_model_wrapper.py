import pathlib

import pandas as pd
from django.test import TestCase, override_settings
from pandas.testing import assert_frame_equal

from gamedays.models import Gameinfo
from gamedays.service.model_wrapper import GamedayModelWrapper

TESTDATA = 'testdata.json'


def get_df_from_json(filename):
    return pd.read_json(pathlib.Path(__file__).parent / 'testdata/{0}.json'.format(filename),
                        orient='table')


@override_settings(SUSPEND_SIGNALS=True)
class TestGamedayModelWrapper(TestCase):
    fixtures = [TESTDATA]

    def test_no_gameinfos_for_gameday(self):
        with self.assertRaises(Gameinfo.DoesNotExist):
            GamedayModelWrapper(3)

    def test_has_finalround(self):
        gameday_with_finalround = 1
        gmw = GamedayModelWrapper(gameday_with_finalround)
        assert gmw.has_finalround()
        gameday_without_finalround = 2
        gmw = GamedayModelWrapper(gameday_without_finalround)
        assert not gmw.has_finalround()

    def test_get_schedule(self):
        gameday_pk = 1
        expected_schedule = get_df_from_json('ts_schedule')
        schedule = GamedayModelWrapper(gameday_pk).get_schedule()
        del expected_schedule['Kick-Off']
        del schedule['Kick-Off']
        assert_frame_equal(schedule, expected_schedule, check_dtype=False)

    def test_empty_get_qualify_table(self):
        gameday_with_no_qualify = 2
        gmw = GamedayModelWrapper(gameday_with_no_qualify)
        assert gmw.get_qualify_table() is ''

    def test_get_qualify_table(self):
        gameday_with_qualify = 1
        gmw = GamedayModelWrapper(gameday_with_qualify)
        expected_qualify_table = get_df_from_json('ts_qualify_table')
        assert_frame_equal(gmw.get_qualify_table(), expected_qualify_table, check_dtype=False)

    def test_empty_get_final_table(self):
        gameday_with_empty_final_round = 4
        gmw = GamedayModelWrapper(gameday_with_empty_final_round)
        assert gmw.get_final_table() == ''

    def test_get_final_table(self):
        gameday_with_final_round = 1
        expected_final_table = get_df_from_json('ts_final_table_6_teams')
        gmw = GamedayModelWrapper(gameday_with_final_round)
        assert_frame_equal(gmw.get_final_table(), expected_final_table, check_dtype=False)

    def test_get_final_table_for_7_teams(self):
        gameday_with_7_teams = 5
        expected_table = get_df_from_json('ts_final_table_7_teams')
        gmw = GamedayModelWrapper(gameday_with_7_teams)
        assert_frame_equal(gmw.get_final_table(), expected_table, check_dtype=False)

    def test_get_final_table_for_main_round(self):
        gameday_with_main_round = 2
        expected_table = get_df_from_json('ts_final_table_4_teams')
        gmw = GamedayModelWrapper(gameday_with_main_round)
        assert_frame_equal(gmw.get_final_table(), expected_table, check_dtype=False)

    def test_get_qualify_team_by(self):
        gameday_id = 1
        gmw = GamedayModelWrapper(gameday_id)
        assert gmw.get_qualify_team_by(place=1, standing='Gruppe 1') == 'Nieder'

    def test_get_team_by_points(self):
        gameday_id = 1
        gmw = GamedayModelWrapper(gameday_id)
        assert gmw.get_team_by_points(place=1, standing='HF', points=3) == 'Pandas'
        assert gmw.get_team_by_points(place=1, standing='HF', points=0) == 'Nieder'

    def test_get_team_by(self):
        gameday_id = 1
        gmw = GamedayModelWrapper(gameday_id)
        assert gmw.get_team_by(place=1, standing='HF', points=3) == 'Pandas'
        assert gmw.get_team_by(place=1, standing='Gruppe 1') == 'Nieder'

    def test_is_finished(self):
        gameday_with_qualify = 1
        gmw = GamedayModelWrapper(gameday_with_qualify)
        assert gmw.is_finished('Vorrunde')
        assert not gmw.is_finished('HF')

        gi: Gameinfo = Gameinfo.objects.get(id=61)
        gi.status = 'beendet'
        gi.save()

        gmw = GamedayModelWrapper(gameday_with_qualify)
        assert gmw.is_finished('P1')
