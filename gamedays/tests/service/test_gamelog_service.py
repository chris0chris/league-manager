import json
import pathlib

from django.test import TestCase

from gamedays.models import Gameinfo, Gameresult, TeamLog
from gamedays.service.gamelog_service import GameLog, GameLogObject, GameLogEncoder
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamelogService(TestCase):
    pass


class TestGamelog(TestCase):
    def test_game_not_available(self):
        with self.assertRaises(Gameinfo.DoesNotExist):
            GameLog(1)

    def test_get_home_and_away_team(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry.pk)
        home = Gameresult.objects.get(gameinfo=firstGameEntry, isHome=True).team
        away = Gameresult.objects.get(gameinfo=firstGameEntry, isHome=False).team
        assert gamelog.get_home_team() == home
        assert gamelog.get_away_team() == away

    def test_entries_per_half(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry.pk)
        assert len(gamelog.get_entries_home_firsthalf()) == 5
        assert len(gamelog.get_entries_home_secondhalf()) == 5
        assert len(gamelog.get_entries_away_firsthalf()) == 0
        assert len(gamelog.get_entries_away_secondhalf()) == 4

    def test_get_gamelog_as_json(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry.pk)
        with open(pathlib.Path(__file__).parent / 'testdata/teamlog.json') as f:
            expected_gamelog = json.load(f)
        expected_gamelog['gameId'] = firstGameEntry.pk
        assert gamelog.as_json() == json.dumps(expected_gamelog)

    def test_firsthalf_is_played(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry.pk)
        assert gamelog.is_firsthalf() == True

    def test_secondhalf_is_played(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        firstGameEntry.gameHalftime = '09:57'
        firstGameEntry.save()
        gamelog = GameLog(firstGameEntry.pk)
        assert gamelog.is_firsthalf() == False

    def test_json_representation_of_gamelog_object(self):
        g = GameLogObject(81, 'White', 'Red')
        g.home.score = 18
        g.away.score = 7
        assert json.dumps(g.as_json(), cls=GameLogEncoder) == json.dumps(
            {'gameId': 81,
             'isFirstHalf': True,
             'home': {
                 'name': 'White',
                 'score': 18,
                 'firsthalf': {'score': None, 'entries': []},
                 'secondhalf': {'score': None, 'entries': []}},
             'away': {
                 'name': 'Red',
                 'score': 7,
                 'firsthalf': {'score': None, 'entries': []},
                 'secondhalf': {'score': None, 'entries': []}}})

    def test_create_entries(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry.pk)
        assert gamelog.create_entries_for_half(
            TeamLog.objects.filter(gameinfo=firstGameEntry, team='Home', half=1)) == [
                   {'sequence': 1, 'td': 19, },
                   {'sequence': 2, 'td': 19, 'pat2': 7, },
                   {'sequence': 3, 'td': 19, 'pat1': 7, }
               ]
