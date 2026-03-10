import pytest
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Season, League
from datetime import date

class GameResultsAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username="admin", password="password", email="admin@test.com")
        self.client.force_authenticate(user=self.user)
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")
        self.team_a = Team.objects.create(name="Team A", description="Desc A")
        self.team_b = Team.objects.create(name="Team B", description="Desc B")
        self.gameday = Gameday.objects.create(
            name="Test", season=self.season, league=self.league,
            date=date(2026, 2, 3), start="10:00", author=self.user
        )
        self.game = Gameinfo.objects.create(gameday=self.gameday, scheduled="10:00", field=1, officials=self.team_a)
        Gameresult.objects.create(gameinfo=self.game, team=self.team_a, isHome=True)
        Gameresult.objects.create(gameinfo=self.game, team=self.team_b, isHome=False)

    def test_get_gameday_games(self):
        url = f"/api/gamedays/{self.gameday.id}/games/"
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_update_game_result(self):
        url = f"/api/gamedays/{self.gameday.id}/games/{self.game.id}/results/"
        data = {"results": [
            {"team_id": self.team_a.id, "fh": 2, "sh": 1, "isHome": True},
            {"team_id": self.team_b.id, "fh": 1, "sh": 0, "isHome": False}
        ]}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        
        self.game.refresh_from_db()
        res_a = Gameresult.objects.get(gameinfo=self.game, team=self.team_a)
        assert res_a.fh == 2
        assert res_a.sh == 1
