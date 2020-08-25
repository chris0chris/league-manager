import json

import numpy as np
import pandas as pd
from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.gameday_service import GamedayService
from gamedays.service.model_wrapper import GamedayModelWrapper

TESTDATA = 'testdata.json'


class TestGamedayService(TestCase):
    fixtures = [TESTDATA]

    def test_get_empty_schedule(self):
        gameday_pk = 2
        gs = GamedayService()
        schedule = gs.get_schedule()
        self.assertEqual(schedule, 'Spielplan wurde noch nicht erstellt')


class TestModelWrapper(TestCase):
    fixtures = [TESTDATA]

    def test_no_gameinfos_for_gameday(self):
        with self.assertRaises(Gameinfo.DoesNotExist):
            GamedayModelWrapper(3)

    def test_has_finalround(self):
        return
        gameday_with_finalround = 1
        mw = GamedayModelWrapper(gameday_with_finalround)
        self.assertTrue(mw.has_finalround())
        gameday_without_finalround = 2
        mw = GamedayModelWrapper(gameday_without_finalround)
        self.assertFalse(mw.has_finalround())

    def test_get_schedule(self):
        gameday_pk = 1
        with open('gamedays/tests/service/schedule_aux-bowl.json') as f:
            data = json.load(f)
        expected_schedule = pd.read_json('gamedays/tests/service/schedule_aux-bowl.json', orient='table')
        gmw = GamedayModelWrapper(gameday_pk)
        self.assertTrue(np.array_equal(expected_schedule['Heim'].values, gmw.get_schedule()['Heim'].values))
        self.assertTrue(np.array_equal(expected_schedule['Gast'].values, gmw.get_schedule()['Gast'].values))
