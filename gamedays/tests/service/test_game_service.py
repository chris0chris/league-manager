import re

from django.test import TestCase

from gamedays.models import Team, Gameinfo, Gameresult, TeamLog
from gamedays.service.game_service import GameService
from gamedays.service.gamelog import GameLog
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameService(TestCase):
    def test_game_not_available(self):
        with self.assertRaises(Gameinfo.DoesNotExist):
            GameService(1)

    def test_update_game_by_halftime(self):
        gameday = DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_halftime(gameday.author)
        firstGame = Gameinfo.objects.first()
        assert firstGame.status == '2. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameHalftime))
        assert len(TeamLog.objects.all()) == 1

    def test_gamestart_is_updated(self):
        gameday = DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_gamestart(gameday.author)
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == '1. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameStarted))
        assert len(TeamLog.objects.all()) == 1


    def test_gamefinished_is_updated(self):
        gameday = DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_game_finished(gameday.author)
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == 'beendet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameFinished))
        assert len(TeamLog.objects.all()) == 1

    def test_entry_for_game_created_halftime_and_finished_only_written_once(self):
        gameday = DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_gamestart(gameday.author)
        game_service.update_gamestart(gameday.author)
        game_service.update_halftime(gameday.author)
        game_service.update_halftime(gameday.author)
        game_service.update_game_finished(gameday.author)
        game_service.update_game_finished(gameday.author)
        assert len(TeamLog.objects.all()) == 3


    def test_update_score(self):
        DBSetup().g62_status_empty()
        team_A1 = Team.objects.get(name='A1')
        team_A2 = Team.objects.get(name='A2')
        game = DBSetup().create_teamlog_home_and_away(home=team_A1, away=team_A2)
        gamelog = GameLog(game)
        game_service = GameService(game.pk)
        game_service.update_score(gamelog)
        assert Gameresult.objects.get(gameinfo=game, team=team_A1).fh == 21
        assert Gameresult.objects.get(gameinfo=game, team=team_A1).sh == 21
        assert Gameresult.objects.get(gameinfo=game, team=team_A1).pa == 3
        assert Gameresult.objects.get(gameinfo=game, team=team_A2).fh == 0
        assert Gameresult.objects.get(gameinfo=game, team=team_A2).sh == 3
        assert Gameresult.objects.get(gameinfo=game, team=team_A2).pa == 42

    def test_delete_entry(self):
        DBSetup().g62_status_empty()
        game = DBSetup().create_teamlog_home_and_away()
        game_service = GameService(game.pk)
        gamelog = game_service.delete_gamelog(2)
        assert gamelog.get_home_score() == 34
        assert gamelog.get_home_firsthalf_score() == 13
