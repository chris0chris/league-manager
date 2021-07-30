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
        first_home = Gameresult.objects.get(gameinfo=firstGame, isHome=True)
        first_away = Gameresult.objects.get(gameinfo=firstGame, isHome=False)
        assert first_home.fh == 12
        assert first_home.sh == 8
        assert first_home.pa == 25
        assert first_away.fh == 9
        assert first_away.sh == 16
        assert first_away.pa == 20

    def test_get_team_names(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        gameresult_wrapper = GameresultWrapper(lastGame)
        assert gameresult_wrapper.get_home_name() == 'A1'
        assert gameresult_wrapper.get_away_name() == 'B1'

    def test_get_team_fullnames(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        gameresult_wrapper = GameresultWrapper(lastGame)
        assert gameresult_wrapper.get_home_fullname() == 'AAAAAAA1'
        assert gameresult_wrapper.get_away_fullname() == 'BBBBBBB1'

    def test_get_team_scores(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        Gameresult.objects.filter(gameinfo=lastGame, isHome=True).update(fh=3, sh=2)
        gameresult_wrapper = GameresultWrapper(lastGame)
        assert gameresult_wrapper.get_home_score() == 5
        assert gameresult_wrapper.get_away_score() == 0