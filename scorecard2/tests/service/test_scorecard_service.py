from django.test import TestCase

from gamedays.models import Team, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_manager.utils.view_utils import UserRequestPermission
from scorecard2.service.scorecard_service import ScorecardGamedayService


class TestScorecardGamedayService(TestCase):
    def setUp(self):
        self.gameday1 = DBSetup().g62_status_empty()
        self.gameday2 = DBSetup().g62_qualify_finished()
        self.team1 = Team.objects.create(name="Team A", description="Team A", location="City A")
        self.team2 = Team.objects.create(name="Team B", description="Team B", location="City B")
        self.game1: Gameinfo = Gameinfo.objects.first()
        self.game1.officials = self.team1
        self.game1.save()
        self.game2: Gameinfo = Gameinfo.objects.last()
        self.game2.officials = self.team2
        self.game2.save()

    def test_get_officiating_games_for_staff_user(self):
        gameday_service = ScorecardGamedayService(gameday_id=None, user_permission=UserRequestPermission(is_staff=True))
        result = gameday_service.get_officiating_games(None)['gamedays']
        assert len(result) == 2
        assert len(result[0]['games']) == 11
        assert len(result[1]['games']) == 11

    def test_get_officiating_games_for_participating_non_staff_team(self):
        gameday_service = ScorecardGamedayService(gameday_id=None, user_permission=UserRequestPermission(is_staff=True))
        result = gameday_service.get_officiating_games(self.team1.pk)['gamedays']
        assert len(result) == 1
        assert len(result[0]['games']) == 11

    def test_get_officiating_games_for_participating_non_staff_team_only_non_finished_games(self):
        gameday_service = ScorecardGamedayService(gameday_id=None,
                                                  user_permission=UserRequestPermission(is_staff=False))
        result = gameday_service.get_officiating_games(self.team2.pk)['gamedays']
        assert len(result) == 1
        assert len(result[0]['games']) == 5

    def test_get_officiating_gameinfo_for_non_officiating_team(self):
        team3 = Team.objects.create(name="Team C", description="Team  C", location="City C")
        gameday_service = ScorecardGamedayService(gameday_id=None,
                                                  user_permission=UserRequestPermission(is_staff=False))
        with self.assertRaises(PermissionError) as error:
            gameday_service.get_officiating_games(team3.name)
        assert str(error.exception) == 'Zugriff auf Spieltag nicht erlaubt, da ihr als Team nicht am Spieltag teilnehmt.'

    def test_get_officiating_gameinfo_for_previous_gamedays(self):
        gameday = DBSetup().g62_qualify_finished()
        gameday.date = '2022-01-07'
        gameday.save()
        game: Gameinfo = Gameinfo.objects.last()
        game.officials = self.team1
        game.save()
        gameday_service = ScorecardGamedayService(gameday_id=gameday.pk,
                                                  user_permission=UserRequestPermission(is_staff=False))
        with self.assertRaises(PermissionError) as error:
            gameday_service.get_officiating_games(self.team1.pk)
        assert str(error.exception) == 'Zugriff auf Spieltag nicht erlaubt, da der Spieltag nicht heute stattfindet.'
