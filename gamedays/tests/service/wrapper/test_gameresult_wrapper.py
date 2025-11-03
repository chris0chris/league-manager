from django.test import TestCase

from gamedays.models import Gameinfo, Gameresult
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameresultWrapper(TestCase):
    def test_saves_score(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        gameresult_wrapper = GameresultWrapper(first_game)
        gameresult_wrapper.save_home_first_half(12, 9)
        gameresult_wrapper.save_away_first_half(9, 12)
        gameresult_wrapper.save_home_second_half(8, 16)
        gameresult_wrapper.save_away_second_half(16, 8)
        first_home = Gameresult.objects.get(gameinfo=first_game, isHome=True)
        first_away = Gameresult.objects.get(gameinfo=first_game, isHome=False)
        assert first_home.fh == 12
        assert first_home.sh == 8
        assert first_home.pa == 25
        assert first_away.fh == 9
        assert first_away.sh == 16
        assert first_away.pa == 20

    def test_get_team_names(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        gameresult_wrapper = GameresultWrapper(last_game)
        assert gameresult_wrapper.get_home_name() == 'A1'
        assert gameresult_wrapper.get_away_name() == 'B1'

    def test_get_team_fullnames(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        gameresult_wrapper = GameresultWrapper(last_game)
        assert gameresult_wrapper.get_home_fullname() == 'AAAAAAA1'
        assert gameresult_wrapper.get_away_fullname() == 'BBBBBBB1'

    def test_get_team_scores(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        Gameresult.objects.filter(gameinfo=last_game, isHome=True).update(fh=3, sh=2)
        gameresult_wrapper = GameresultWrapper(last_game)
        assert gameresult_wrapper.get_home_score() == 5
        assert gameresult_wrapper.get_away_score() == 0

    def test_create_gameresult(self):
        expected_team = DBSetup().create_teams('new_team', 1)[0]
        expected_gameinfo = DBSetup.create_gameinfo()
        gameresult_wrapper = GameresultWrapper(expected_gameinfo)
        gameresult, _ = gameresult_wrapper.create(team=expected_team, fh=6, sh=7, pa=5, is_home=True)
        assert gameresult.gameinfo == expected_gameinfo
        assert gameresult.team == expected_team
        assert gameresult.isHome == True
        assert gameresult.pa == 5
        assert gameresult.fh == 6
        assert gameresult.sh == 7
