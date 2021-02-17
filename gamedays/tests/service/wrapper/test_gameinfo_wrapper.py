import re

from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup


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
        assert firstGame.status == 'gestartet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameStarted))

    def test_game_finished_value_is_set(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper(firstGame.pk)
        gameinfo_wrapper.set_game_finished_to_now()
        firstGame: Gameinfo = Gameinfo.objects.first()
        assert firstGame.status == 'beendet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameFinished))
