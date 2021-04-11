import json
import pathlib

from django.contrib.auth.models import User
from django.test import TestCase

from gamedays.service.gamelog import GameLog, GameLogObject, GameLogCreator
from gamedays.service.utils import AsJsonEncoder
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult, TeamLog, Team


class TestGamelog(TestCase):
    def test_get_home_and_away_team(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        home = Gameresult.objects.get(gameinfo=firstGameEntry, isHome=True).team.name
        away = Gameresult.objects.get(gameinfo=firstGameEntry, isHome=False).team.name
        assert gamelog.get_home_team() == home
        assert gamelog.get_away_team() == away

    def test_entries_per_half(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        assert len(gamelog.get_entries_home_firsthalf()) == 5
        assert len(gamelog.get_entries_home_secondhalf()) == 5
        assert len(gamelog.get_entries_away_firsthalf()) == 0
        assert len(gamelog.get_entries_away_secondhalf()) == 4

    def test_get_gamelog_as_json(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        with open(pathlib.Path(__file__).parent / 'testdata/teamlog.json') as f:
            expected_gamelog = json.load(f)
        expected_gamelog['gameId'] = firstGameEntry.pk
        assert gamelog.as_json() == json.dumps(expected_gamelog)

    def test_firsthalf_is_played(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        assert gamelog.is_firsthalf()

    def test_secondhalf_is_played(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        firstGameEntry.gameHalftime = '09:57'
        firstGameEntry.save()
        gamelog = GameLog(firstGameEntry)
        assert not gamelog.is_firsthalf()

    def test_json_representation_of_gamelog_object(self):
        g = GameLogObject(81, 'White', 'Red')
        g.home.score = 18
        g.away.score = 7
        assert json.dumps(g.as_json(), cls=AsJsonEncoder) == json.dumps(
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
        gamelog = GameLog(firstGameEntry)

        assert gamelog.create_entries_for_half(
            TeamLog.objects.filter(gameinfo=firstGameEntry, team=1, half=1)) == [
                   {'sequence': 1, 'td': 19, },
                   {'sequence': 2, 'td': 19, 'pat2': 7, },
                   {'sequence': 3, 'td': 19, 'pat1': 7, }
               ]

    def test_get_half_score(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        assert gamelog.get_home_firsthalf_score() == 21
        assert gamelog.get_home_secondhalf_score() == 21
        assert gamelog.get_away_firsthalf_score() == 0
        assert gamelog.get_away_secondhalf_score() == 3

    def test_mark_log_deleted(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        sequence = 2
        gamelog = GameLog(gameinfo)
        gamelog.mark_entries_as_deleted(sequence)
        gamelog_list = TeamLog.objects.filter(sequence=sequence)
        assert gamelog_list[0].isDeleted
        assert gamelog_list[1].isDeleted
        assert gamelog.create_entries_for_half(
            TeamLog.objects.filter(gameinfo=gameinfo, team=1, half=1)) == [
                   {'sequence': 1, 'td': 19, },
                   {'sequence': 2, 'td': 19, 'pat2': 7, 'isDeleted': True},
                   {'sequence': 3, 'td': 19, 'pat1': 7, }
               ]
        assert gamelog.get_home_firsthalf_score() == 13
        assert gamelog.get_home_score() == 34


class TestGamelogCreator(TestCase):
    def test_gamelog_with_timeout(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        gamelog_creator = GameLogCreator(firstGame, team, [{"name": "Auszeit", "input": "00:01"}], user)
        gamelog_creator.create()
        assert len(TeamLog.objects.all()) == 1
        teamlog = TeamLog.objects.first()
        assert teamlog.sequence == 0
        assert teamlog.input == '00:01'
        assert teamlog.value == 0
        assert teamlog.half == 1

    def test_gamelog_with_penalty(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        gamelog_creator = GameLogCreator(firstGame, team, [{"name": "Strafe", "input": "illegaler Kontakt"}], user)
        gamelog_creator.create()
        assert len(TeamLog.objects.all()) == 1
        teamlog = TeamLog.objects.first()
        assert teamlog.sequence == 0
        assert teamlog.input == 'illegaler Kontakt'
        assert teamlog.value == 0
        assert teamlog.half == 1

    def test_gamelog_is_created(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        gamelog_creator = GameLogCreator(firstGame, team,
                                         [
                                             {"name": "Touchdown", "player": "7"},
                                             {"name": "1-Extra-Punkt", "player": ""},
                                             {"name": "2-Extra-Punkte", "player": "19"},
                                             {"name": "Safety (+1)", "player": "22"},
                                             {"name": "Safety (+2)", "player": "12"},
                                         ]
                                         , user)
        gamelog_creator.create()
        gamelog_creator = GameLogCreator(firstGame, team, [{'name': 'Turnover'}], user, 2)
        gamelog_creator.create()
        assert len(TeamLog.objects.all()) == 6
        teamlog = TeamLog.objects.get(pk=6)
        assert teamlog.sequence == 2
        assert teamlog.value == 0
        assert teamlog.half == 2
        teamlog = TeamLog.objects.get(pk=2)
        assert teamlog.sequence == 1
        assert teamlog.value == 0
        assert teamlog.half == 1
        teamlog = TeamLog.objects.get(pk=1)
        assert teamlog.sequence == 1
        assert teamlog.value == 6
        assert teamlog.half == 1
