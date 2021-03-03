import re

from django.test import TestCase

from gamedays.service.game_service import GameService
from gamedays.service.gamelog import GameLog
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult


class TestGameService(TestCase):
    def test_game_not_available(self):
        with self.assertRaises(Gameinfo.DoesNotExist):
            GameService(1)

    def test_update_game_by_halftime(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_halftime()
        firstGame = Gameinfo.objects.first()
        assert firstGame.status == '2. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameHalftime))

    def test_gamestart_is_updated(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_gamestart()
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == 'gestartet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameStarted))

    def test_gamefinished_is_updated(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_game_finished()
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == 'beendet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameFinished))

    def test_update_score(self):
        DBSetup().g62_status_empty()
        game = DBSetup().create_teamlog_home_and_away(home='A1', away='A2')
        gamelog = GameLog(game)
        game_service = GameService(game.pk)
        game_service.update_score(gamelog)
        assert Gameresult.objects.get(gameinfo=game, team='A1').fh == 21
        assert Gameresult.objects.get(gameinfo=game, team='A1').sh == 21
        assert Gameresult.objects.get(gameinfo=game, team='A2').fh == 0
        assert Gameresult.objects.get(gameinfo=game, team='A2').sh == 3

    def test_delete_entry(self):
        DBSetup().g62_status_empty()
        game = DBSetup().create_teamlog_home_and_away(home='A1', away='A2')
        game_service = GameService(game.pk)
        gamelog = game_service.delete_gamelog(2)
        assert gamelog.get_home_score() == 34
        assert gamelog.get_home_firsthalf_score() == 13