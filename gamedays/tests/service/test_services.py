import pathlib

import numpy as np
import pandas as pd
from django.test import TestCase
from pandas.testing import assert_frame_equal

from gamedays.models import Gameinfo
from gamedays.service.gameday_service import GamedayService, EmptySchedule, EmptyQualifyTable, EmptyFinalTable
from gamedays.service.model_wrapper import GamedayModelWrapper

TESTDATA_FIXTURE = 'testdata.json'


class TestGamedayService(TestCase):
    fixtures = [TESTDATA_FIXTURE]

    def test_get_empty_gameday(self):
        empty_gameday_pk = 3
        gs = GamedayService.create(empty_gameday_pk)
        assert gs.get_schedule().to_html() == EmptySchedule.to_html()
        assert gs.get_qualify_table().to_html() == EmptyQualifyTable.to_html()
        assert gs.get_final_table().to_html() == EmptyFinalTable.to_html()


class TestModelWrapper(TestCase):
    fixtures = [TESTDATA_FIXTURE]

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
        expected_schedule = pd.read_json(pathlib.Path(__file__).parent / 'testdata/ts_schedule.json', orient='table')
        schedule = GamedayModelWrapper(gameday_pk).get_schedule()
        assert np.array_equal(schedule['Heim'].values, expected_schedule['Heim'].values)
        assert np.array_equal(schedule['Gast'].values, expected_schedule['Gast'].values)

    def test_empty_get_qualify_table(self):
        gameday_with_no_qualify = 2
        gmw = GamedayModelWrapper(gameday_with_no_qualify)
        assert gmw.get_qualify_table() is ''

    def test_get_qualify_table(self):
        gameday_with_qualify = 1
        gmw = GamedayModelWrapper(gameday_with_qualify)
        expected_qualify_table = pd.read_json(pathlib.Path(__file__).parent / 'testdata/ts_qualify_table.json',
                                              orient='table')
        assert_frame_equal(gmw.get_qualify_table(), expected_qualify_table, check_dtype=False)

    def test_empty_get_final_table(self):
        gameday_with_empty_final_round = 4
        gmw = GamedayModelWrapper(gameday_with_empty_final_round)
        assert gmw.get_final_table() == ''

    def test_get_final_table(self):
        gameday_with_final_round = 1
        gmw = GamedayModelWrapper(gameday_with_final_round)
