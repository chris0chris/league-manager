from django.test import TestCase

from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult


class TestGameresultWrapper(TestCase):
    def test_saves_score(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        gameresult_wrapper = GameresultWrapper(firstGame)
        gameresult_wrapper.save_home_first_half(12, 9)
        gameresult_wrapper.save_away_first_half(9, 12)
        gameresult_wrapper.save_home_second_half(8, 16)
        gameresult_wrapper.save_away_second_half(16, 8)
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=True).fh == 12
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=False).fh == 9
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=True).sh == 8
        assert Gameresult.objects.get(gameinfo=firstGame, isHome=False).sh == 16
