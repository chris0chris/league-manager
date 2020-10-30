from django.test import TestCase

from gamedays.models import GameOfficial, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameOfficials(TestCase):

    def test_officials_are_created(self):
        DBSetup().g62_status_empty()

        assert len(GameOfficial.objects.all()) == 0
        official = GameOfficial(gameinfo=Gameinfo.objects.all().first(), name='Horst', position='Scorecard')
        official.save()
        assert len(GameOfficial.objects.all()) == 1
