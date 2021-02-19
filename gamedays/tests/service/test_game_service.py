import re

from django.test import TestCase

from gamedays.models import Gameinfo, Gameresult
from gamedays.service.game_service import GameService
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameService(TestCase):
    def test_game_not_available(self):
        with self.assertRaises(Gameinfo.DoesNotExist):
            GameService(1)

    def test_update_game_by_halftime(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameService(firstGame.pk)
        game_service.update_halftime(home_score=12, away_score=9)
        firstGame = Gameinfo.objects.first()
        assert firstGame.status == '2. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameHalftime))
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=True).fh == 12
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=False).fh == 9

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
        game_service.update_game_finished(home_score=6, away_score=8)
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == 'beendet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameFinished))
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=True).sh == 6
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=False).sh == 8
