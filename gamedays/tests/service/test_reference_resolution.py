import pytest
from django.test import TestCase
from gamedays.models import Gameday, Gameinfo, Team, Season, League, Association
from django.contrib.auth.models import User
from gamedays.service.gameday_service import GamedayService


class TestReferenceResolution(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.association = Association.objects.create(
            name="Test Association", abbr="TA"
        )
        self.season = Season.objects.create(name="Test Season")
        self.league = League.objects.create(name="Test League")
        self.team_a = Team.objects.create(
            name="Team A", description="A", location="L", association=self.association
        )
        self.team_b = Team.objects.create(
            name="Team B", description="B", location="L", association=self.association
        )

        # Create Gameday with designer_data
        self.gameday = Gameday.objects.create(
            name="Test Gameday",
            date="2026-01-17",
            start="10:00",
            season=self.season,
            league=self.league,
            author=self.user,
            designer_data={
                "nodes": [
                    {"id": "game1", "type": "game", "data": {"standing": "Game 1"}},
                    {
                        "id": "game2",
                        "type": "game",
                        "data": {
                            "standing": "Final",
                            "homeTeamDynamic": {
                                "type": "winner",
                                "matchName": "Game 1",
                            },
                        },
                    },
                ]
            },
        )

        # Create corresponding Gameinfo objects
        self.gi1 = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="10:00",
            field=1,
            stage="Preliminary",
            standing="Game 1",
            officials=self.team_a,
            status=Gameinfo.STATUS_PUBLISHED,
        )

        self.gi2 = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="11:00",
            field=1,
            stage="Final",
            standing="Final",
            officials=self.team_b,
            status=Gameinfo.STATUS_PUBLISHED,
        )

    def test_resolve_reference_winner(self):
        # Record result for Game 1
        from gamedays.models import Gameresult

        Gameresult.objects.create(
            gameinfo=self.gi1, team=self.team_a, fh=14, sh=7, isHome=True
        )
        Gameresult.objects.create(gameinfo=self.gi1, team=self.team_b, fh=0, sh=7)

        self.gi1.status = Gameinfo.STATUS_COMPLETED
        self.gi1.final_score = {"home": 21, "away": 7}
        self.gi1.save()

        # Resolve references
        service = GamedayService(self.gameday.pk)
        resolved_data = service.get_resolved_designer_data()

        # Check game2 node
        game2_node = next(n for n in resolved_data["nodes"] if n["id"] == "game2")
        assert game2_node["data"]["resolvedHomeTeam"] == "Team A"
