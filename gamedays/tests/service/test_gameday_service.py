from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.gameday_service import GamedayService, EmptySchedule, EmptyQualifyTable, EmptyFinalTable
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayService(TestCase):

    def test_get_empty_gameday_to_html(self):
        gs = GamedayService.create(None)
        assert gs.get_schedule().to_html() == EmptySchedule.to_html()
        assert gs.get_qualify_table().to_html() == EmptyQualifyTable.to_html()
        assert gs.get_final_table().to_html() == EmptyFinalTable.to_html()

    def test_get_empty_gameday_to_json(self):
        gs = GamedayService.create(None)
        assert gs.get_schedule().to_json() == EmptySchedule.to_json()
        assert gs.get_qualify_table().to_json() == EmptyQualifyTable.to_json()
        assert gs.get_final_table().to_json() == EmptyFinalTable.to_json()

    def test_get_games_to_whistle(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(id=1).update(gameFinished='12:00')
        gs = GamedayService.create(gameday.pk)
        games_to_whistle = gs.get_games_to_whistle('officials')
        assert len(games_to_whistle) == 5

    def test_get_all_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(id=1).update(gameFinished='12:00')
        gs = GamedayService.create(gameday.pk)
        games_to_whistle = gs.get_games_to_whistle('*')
        assert len(games_to_whistle) == 10
