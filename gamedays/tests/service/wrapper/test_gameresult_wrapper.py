from django.test import TestCase

from gamedays.models import Gameinfo, Gameresult
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameresultWrapper(TestCase):
    def test_saves_score(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        gameresult_wrapper = GameresultWrapper(firstGame)
        gameresult_wrapper.save_home_first_half(12, 9)
        gameresult_wrapper.save_away_first_half(9, 12)
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=True).fh == 12
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=False).fh == 9
