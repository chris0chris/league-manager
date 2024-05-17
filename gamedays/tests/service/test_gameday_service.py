from django.core.exceptions import ObjectDoesNotExist
from django.test import TestCase

from gamedays.models import Gameinfo, Team
from gamedays.service.gameday_service import GamedayServiceDeprecated, EmptySchedule, EmptyQualifyTable, \
    EmptyFinalTable, GamedayService
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_manager.utils.view_utils import UserRequestPermission


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


class TestGamedayService(TestCase):
    def setUp(self):
        self.gameday = DBSetup().g62_status_empty()
        self.team1 = Team.objects.create(name="Team A", description="Team A", location="City A")
        self.team2 = Team.objects.create(name="Team B", description="Team B", location="City B")
        all_gameinfo = Gameinfo.objects.all()
        self.game1: Gameinfo = all_gameinfo[0]
        self.game1.officials = self.team1
        self.game1.save()
        self.game2: Gameinfo = all_gameinfo[1]
        self.game2.officials = self.team2
        self.game2.save()

    def test_get_officiating_gameinfo_staff_user(self):
        gameday_service = GamedayService(user_permission=UserRequestPermission(is_staff=True))
        gameinfo_queryset = gameday_service.get_officiating_gameinfo(officiating_team=None, gameday=[self.gameday])
        assert gameinfo_queryset.count() == 11

    def test_get_officiating_gameinfo_all_games_for_non_officiating_team(self):
        team3 = Team.objects.create(name="Team C", description="Team C", location="City C")
        gameday_service = GamedayService(user_permission=UserRequestPermission(is_user=True))
        with self.assertRaises(ObjectDoesNotExist):
            gameday_service.get_officiating_gameinfo(officiating_team=team3, gameday=[self.gameday],
                                                     all_games_wanted=True)

    def test_get_officiating_gameinfo_for_non_officiating_team(self):
        team3 = Team.objects.create(name="Team C", description="Team C", location="City C")
        gameday_service = GamedayService(user_permission=UserRequestPermission(is_user=True))
        with self.assertRaises(ObjectDoesNotExist):
            gameday_service.get_officiating_gameinfo(officiating_team=team3, gameday=[self.gameday])

    def test_get_officiating_gameinfo_specific_team(self):
        gameday_service = GamedayService(user_permission=UserRequestPermission(is_user=True))
        gameinfo_queryset = gameday_service.get_officiating_gameinfo(officiating_team=self.team2,
                                                                     gameday=[self.gameday])
        assert gameinfo_queryset.count() == 1
        assert gameinfo_queryset.first() == self.game2

    def test_get_officiating_gameinfo_specific_team_all_games(self):
        gameday_service = GamedayService(user_permission=UserRequestPermission(is_user=True))
        gameinfo_queryset = gameday_service.get_officiating_gameinfo(officiating_team=self.team1,
                                                                     gameday=[self.gameday], all_games_wanted=True)
        assert gameinfo_queryset.count() == 11

    def test_get_officiating_gameinfo_additional_values(self):
        gameday_service = GamedayService(user_permission=UserRequestPermission(is_user=True))
        gameinfo_queryset = gameday_service.get_officiating_gameinfo(officiating_team=self.team2,
                                                                     gameday=[self.gameday])
        gameinfo = gameinfo_queryset.first()
        assert isinstance(gameinfo.home_id, int)
        assert gameinfo.home == 'AAAAAAA2'
        assert isinstance(gameinfo.away_id, int)
        assert gameinfo.away == 'AAAAAAA3'
        assert gameinfo.officials == self.team2
