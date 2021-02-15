import re

from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameinfoWrapper(TestCase):
    def test_halftime_value_is_saved(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        game_service = GameinfoWrapper(firstGame.pk)
        game_service.set_halftime_to_now()
        firstGame = Gameinfo.objects.first()
        assert firstGame.status == '2. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameHalftime))
