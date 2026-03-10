import pytest
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Season, League
from gamedays.service.bracket_resolution import BracketResolutionService
from datetime import date
from django.contrib.auth.models import User

@pytest.mark.django_db
class TestBracketResolutionService:
    def setup_method(self):
        self.user = User.objects.create_user(username="test", password="test")
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")
        self.team_a = Team.objects.create(name="Team A", description="A", location="City")
        self.team_b = Team.objects.create(name="Team B", description="B", location="City")
        self.team_c = Team.objects.create(name="Team C", description="C", location="City")
        self.gameday = Gameday.objects.create(
            name="Test", season=self.season, league=self.league,
            date=date(2026, 2, 3), start="10:00", author=self.user
        )
        self.game1 = Gameinfo.objects.create(
            gameday=self.gameday, scheduled="10:00", field=1,
            officials=self.team_a, stage="Group", standing="Final"
        )
        self.game2 = Gameinfo.objects.create(
            gameday=self.gameday, scheduled="11:00", field=1,
            officials=self.team_a, stage="Semi", standing="Final"
        )
        Gameresult.objects.create(gameinfo=self.game1, team=self.team_a, isHome=True)
        Gameresult.objects.create(gameinfo=self.game1, team=self.team_b, isHome=False)
        Gameresult.objects.create(gameinfo=self.game2, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=self.game2, team=self.team_c, isHome=False)

    def test_resolve_winner_reference(self):
        service = BracketResolutionService()
        home = Gameresult.objects.get(gameinfo=self.game1, isHome=True)
        away = Gameresult.objects.get(gameinfo=self.game1, isHome=False)
        home.fh, home.sh = 2, 1
        home.save()
        away.fh, away.sh = 1, 0
        away.save()
        resolved = service.resolve_winner_reference(game_id=self.game1.id, gameday=self.gameday)
        assert resolved == self.team_a

    def test_get_unresolved_references(self):
        service = BracketResolutionService()
        unresolved = service.get_unresolved_references(gameday=self.gameday)
        assert self.game2.id in [g.id for g in unresolved]
