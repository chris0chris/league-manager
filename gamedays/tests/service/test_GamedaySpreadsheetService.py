import json
import unittest
from unittest.mock import patch

import pandas as pd
from gspread_pandas import Spread

from gamedays.service import GamedaySpreadsheetService


class TestGamedaySpreadsheetService(unittest.TestCase):

    @patch.object(Spread, 'sheet_to_df')
    def test_get_gameday(self, sheet_mock):
        with open('gamedays/tests/service/gameday.json') as f:
            data = json.load(f)
        sheet_mock.return_value = pd.DataFrame(data)
        gameday = GamedaySpreadsheetService.get_gameday(1)

        self.assertEqual(gameday.date, '07.12.2020')
        self.assertEqual(gameday.start.strftime('%H:%M'), '10:00')
        self.assertEqual(gameday.cap_meeting.strftime('%H:%M'), '09:30')
        self.assertEqual(gameday.host, 'Test Host')
        self.assertEqual(gameday.location, 'Test Location')
        self.assertEqual(gameday.name, 'Test Gameday')
