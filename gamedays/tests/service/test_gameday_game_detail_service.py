import re
from os.path import split

from django.test import TestCase

from gamedays.models import Team, Gameinfo, Gameresult, TeamLog
from gamedays.service.game_service import GameService
from gamedays.service.gameday_service import GamedayGameService, EmptyGamedayService, EmptySplitScoreTable, \
    EmptyEventsTable
from gamedays.service.gamelog import GameLog
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameService(TestCase):

    def test_gameday_game_detail_not_available(self):
        ggs = GamedayGameService.create(0)
        assert type(ggs) == type(EmptyGamedayService)
        split_score_table, _ = ggs.get_split_score_table()
        assert type(split_score_table) == type(EmptySplitScoreTable)
        events_table = ggs.get_events_table()
        assert type(events_table) == type(EmptyEventsTable)

    def test_gameday_game_detail_no_events(self):
        gameday = DBSetup().g62_finished()

        games = list(Gameinfo.objects.filter(gameday=gameday.pk))

        for game in games:
            ggs = GamedayGameService.create(game.pk)
            assert ggs.home_team_id != 0
            assert ggs.away_team_id != 0
            assert len(ggs.events) == 0
            assert not ggs.events_ready

    def test_gameday_game_detail_events(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        ggs = GamedayGameService.create(gameinfo.pk)

        events_table = ggs.get_events_table()

        assert len(events_table) > 0
        assert len(events_table.columns) == 3

        split_score_table, repair = ggs.get_split_score_table()

        assert not repair
        assert len(split_score_table) == 2
        assert len(split_score_table.columns) == 4

    def test_gameday_game_detail_not_first_half_teamlog(self):
        gameinfo = DBSetup().create_broken_teamlog_home_and_away()
        ggs = GamedayGameService.create(gameinfo.pk)

        events_table = ggs.get_events_table()

        assert len(events_table) > 0
        assert len(events_table.columns) == 3

        split_score_table, repair = ggs.get_split_score_table()

        assert repair
        assert len(split_score_table) == 2
        assert len(split_score_table.columns) == 4
