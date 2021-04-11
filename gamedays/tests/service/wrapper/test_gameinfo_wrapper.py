import re

from django.test import TestCase

from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo


class TestGameinfoWrapper(TestCase):
    def test_halftime_value_is_set(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper(firstGame.pk)
        gameinfo_wrapper.set_halftime_to_now()
        firstGame = Gameinfo.objects.first()
        assert firstGame.status == '2. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameHalftime))

    def test_gamestarted_value_is_set(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper(firstGame.pk)
        gameinfo_wrapper.set_gamestarted_to_now()
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == '1. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameStarted))

    def test_game_finished_value_is_set(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper(firstGame.pk)
        gameinfo_wrapper.set_game_finished_to_now()
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == 'beendet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameFinished))

    def test_team_in_possesion_is_updated(self):
        DBSetup().g62_status_empty()
        lastGame: Gameinfo = Gameinfo.objects.last()
        gameinfo_wrapper = GameinfoWrapper(lastGame.pk)
        assert lastGame.in_possession == 'A1'
        gameinfo_wrapper.update_team_in_possession('a team')
        assert Gameinfo.objects.last().in_possession == 'a team'
