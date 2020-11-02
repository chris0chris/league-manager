import pathlib

import pandas as pd
from django.test import TestCase
from pandas._testing import assert_frame_equal

from gamedays.tests.setup_factories.db_setup import DBSetup
from league_table.service.league_table import LeagueTable


def get_df_from_json(filename):
    return pd.read_json(pathlib.Path(__file__).parent / 'testdata/{0}'.format(filename),
                        orient='table')


class TestLeagueTable(TestCase):

    def test_empty_league_table(self):
        DBSetup().create_empty_gameday()
        league_table = LeagueTable()
        assert league_table.get_standing() == []

    def test_league_table(self):
        DBSetup().g72_finished()
        DBSetup().g62_finished()
        expected_overall_table = get_df_from_json('league_table_overall.json')
        league_table = LeagueTable()
        assert league_table.get_standing().to_json() == expected_overall_table.to_json()

    def test_league_table_2019(self):
        DBSetup().g62_finished(year='2019')
        DBSetup().g72_finished(year='2019')



    # def test_calculate_table(self):
