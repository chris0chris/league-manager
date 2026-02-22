from django.test import TestCase
from gamedays.models import Team, Gameinfo, Gameday, Gameresult, TeamLog
from gamedays.service.gameday_service import GamedayGameService, EventsTableError
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayGameServiceDataErrors(TestCase):
    """Tests for error handling when event data doesn't match game setup"""

    def test_events_only_for_home_team(self):
        """
        When only home team has events and away team has none,
        should return EventsTableError instead of crashing
        """
        # Create game with two teams
        gameday = DBSetup().g62_finished()
        gameinfo = list(Gameinfo.objects.filter(gameday=gameday.pk))[0]
        home_team = list(Gameresult.objects.filter(gameinfo=gameinfo, isHome=True))[0].team
        away_team = list(Gameresult.objects.filter(gameinfo=gameinfo, isHome=False))[0].team
        
        # Create events ONLY for home team
        author = gameday.author
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home_team,
            sequence=1,
            player=19,
            event="Touchdown",
            value=6,
            half=1,
            author=author,
        )
        
        # Service should detect mismatch
        ggs = GamedayGameService.create(gameinfo.pk)
        events_table = ggs.get_events_table()
        
        # Should return error object, not crash
        assert isinstance(events_table, EventsTableError)
        assert ggs.home_team_name in events_table.error_message

    def test_events_contain_extra_team(self):
        """
        When events reference a third team not in the game,
        should return EventsTableError
        """
        # Create game with two teams
        gameday = DBSetup().g62_finished()
        gameinfo = list(Gameinfo.objects.filter(gameday=gameday.pk))[0]
        home_team = list(Gameresult.objects.filter(gameinfo=gameinfo, isHome=True))[0].team
        away_team = list(Gameresult.objects.filter(gameinfo=gameinfo, isHome=False))[0].team
        
        # Create a third team with events
        extra_team = Team.objects.create(name="Extra Team", description="Extra Team Desc")
        author = gameday.author
        
        # Create events for all three teams (should fail)
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home_team,
            sequence=1,
            event="Touchdown",
            value=6,
            half=1,
            author=author,
        )
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=away_team,
            sequence=2,
            event="Safety",
            value=2,
            half=1,
            author=author,
        )
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=extra_team,
            sequence=3,
            event="Invalid",
            value=1,
            half=1,
            author=author,
        )
        
        ggs = GamedayGameService.create(gameinfo.pk)
        events_table = ggs.get_events_table()
        
        assert isinstance(events_table, EventsTableError)
        assert "Extra Team Desc" in events_table.error_message

    def test_no_events_at_all(self):
        """
        When game has zero team events (only static events like GAME_START),
        should return EventsTableError
        """
        gameday = DBSetup().g62_finished()
        gameinfo = list(Gameinfo.objects.filter(gameday=gameday.pk))[0]
        author = gameday.author
        
        # Create a static event (team=None) to keep events_ready=True
        # This ensures the validation code runs instead of returning EmptyEventsTable
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=None,  # Static event (no team)
            sequence=0,
            event="GAME_START",
            half=1,
            author=author,
        )
        
        # Clear all team-specific events (only delete events where team is not None)
        TeamLog.objects.filter(gameinfo=gameinfo, team__isnull=False).delete()
        
        ggs = GamedayGameService.create(gameinfo.pk)
        events_table = ggs.get_events_table()
        
        assert isinstance(events_table, EventsTableError)
        assert "nicht verfügbar" in events_table.error_message.lower()
