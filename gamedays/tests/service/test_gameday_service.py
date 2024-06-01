from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.gameday_service import GamedayServiceDeprecated, EmptySchedule, EmptyQualifyTable, \
    EmptyFinalTable, GamedayService
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayServiceDeprecated(TestCase):

    def test_get_empty_gameday_to_html(self):
        gs = GamedayServiceDeprecated.create(None)
        assert gs.get_schedule().to_html() == EmptySchedule.to_html()
        assert gs.get_qualify_table().to_html() == EmptyQualifyTable.to_html()
        assert gs.get_final_table().to_html() == EmptyFinalTable.to_html()

    def test_get_empty_gameday_to_json(self):
        gs = GamedayServiceDeprecated.create(None)
        assert gs.get_schedule().to_json() == EmptySchedule.to_json()
        assert gs.get_qualify_table().to_json() == EmptyQualifyTable.to_json()
        assert gs.get_final_table().to_json() == EmptyFinalTable.to_json()

    def test_get_games_to_whistle(self):
        gameday = DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        Gameinfo.objects.filter(id=first_game.pk).update(gameFinished='12:00')
        gs = GamedayServiceDeprecated.create(gameday.pk)
        games_to_whistle = gs.get_games_to_whistle('officials')
        assert len(games_to_whistle) == 5

    def test_get_all_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        Gameinfo.objects.filter(id=first_game.pk).update(gameFinished='12:00')
        gs = GamedayServiceDeprecated.create(gameday.pk)
        games_to_whistle = gs.get_games_to_whistle('*')
        assert len(games_to_whistle) == 10


class MockUserRequestPermission:
    def __init__(self, is_staff=False):
        self.is_staff = is_staff


class TestGamedayService(TestCase):
    def setUp(self):
        self.staff_user_permission = MockUserRequestPermission(is_staff=True)
        self.non_staff_user_permission = MockUserRequestPermission(is_staff=False)
        self.gameday = DBSetup().g62_qualify_finished()

    def test_get_officiating_gameinfo_non_staff(self):
        service = GamedayService(user_permission=self.non_staff_user_permission)
        gamedays = [self.gameday]
        result = service.get_officiating_gameinfo(gamedays)
        assert len(result) == 5

    def test_get_officiating_gameinfo_staff(self):
        service = GamedayService(user_permission=self.staff_user_permission)
        gamedays = [self.gameday]
        result = service.get_officiating_gameinfo(gamedays)
        assert len(result) == 11
