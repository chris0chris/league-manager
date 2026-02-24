import pandas as pd
from django.test import TestCase
from gamedays.service.league_statistics_service import LeagueStatisticsService
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestLeagueStatisticService(TestCase):
    def test_no_league_season_found(self):
        with self.assertRaises(ValueError):
            LeagueStatisticsService(0, 0, 0)

    def test_gameday_with_no_logs(self):
        gameday = DBSetup().g62_finished()

        with self.assertRaises(ValueError):
            LeagueStatisticsService(gameday.season.name, gameday.league.name, 10)

    def test_gameday_with_logs(self):
        gameday = DBSetup().g62_finished()
        for gameinfo in list(gameday.gameinfo_set.all()):
            team_1_result, team_2_result = list(gameinfo.gameresult_set.all())
            DBSetup().create_teamlog_home_and_away(team_1_result.team, team_2_result.team, gameinfo=gameinfo)

        top_n_players = 10
        lss = LeagueStatisticsService(gameday.season.name, gameday.league.name, top_n_players)

        self.assertEqual(len(lss.lsmw.gameday_ids), 1)
        self.assertEqual(len(lss.lsmw.gameinfo_ids), 11) # 6_2 gameday has 11 games

        # 1 Column for the rank
        # 1 Column for the player
        # 1 Column for the number of events
        functions = [
            ("get_touchdowns_table", 2 + 1),
            ("get_interception_table", 2 + 1),
            ("get_one_extra_point_table", 2 + 1),
            ("get_two_extra_point_table", 2 + 1),
            ("get_safety_table", 2 + 1),
            ("get_top_scoring_players", 2 + 6), # 6 different events listed here
        ]

        for function, expected_columns in functions:
            print(function)
            fn = getattr(lss, function)
            df = fn()

            self.assertEqual(len(df.columns), expected_columns)
            if len(df) == 0:
                self.assertTrue(pd.isnull(df["Liga Platzierung"].max()))

                print()
            else:
                self.assertLessEqual(df["Liga Platzierung"].max(), top_n_players)

        table = lss.get_team_event_summary_table()

        self.assertEqual(len(table), 6) # 6 Teams in 6_2 gameday