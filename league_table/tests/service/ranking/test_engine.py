import pathlib

import pandas as pd
import pytest

from league_table.service.datatypes import (
    LeagueConfigRuleset,
    LeagueConfig,
    LeaguePoints,
)
from league_table.service.ranking.engine import LeagueRankingEngine, TieBreakerEngine
from league_table.tests.setup_factories.db_setup_leaguetable import (
    LEAGUE_TABLE_TEST_RULESET,
    LEAGUE_TABLE_TEST_LEAGUE_CONFIG,
)

BASE = pathlib.Path(__file__).parent / "testdata/tiebreak"


class TestTieBreakEngine:

    @pytest.mark.parametrize(
        "table_file, games_file, expected_result_file",
        [
            (
                "direct_points_diff_table.csv",
                "direct_points_diff_games.csv",
                "direct_points_diff_table_expected.csv",
            ),
            (
                "direct_points_scored_table.csv",
                "direct_points_scored_games.csv",
                "direct_points_scored_table_expected.csv",
            ),
            (
                "overall_points_diff_table.csv",
                "overall_points_diff_games.csv",
                "overall_points_diff_table_expected.csv",
            ),
            (
                "overall_points_scored_table.csv",
                "overall_points_scored_games.csv",
                "overall_points_scored_table_expected.csv",
            ),
            (
                "z_name_table.csv",
                "z_name_games.csv",
                "z_name_table_expected.csv",
            ),
            (
                "0_empty_table.csv",
                "0_empty_games.csv",
                "0_empty_table_expected.csv",
            ),
            (
                "league_quotient_table.csv",
                "league_quotient_games.csv",
                "league_quotient_table_expected.csv",
            ),
        ],
        ids=[
            "direct_points_diff",
            "direct_points_scored",
            "overall_points_diff",
            "overall_points_scored",
            "name",
            "initial_empty_table_and_empty_games",
            "league_quotient",
        ],
    )
    def test_run_tie_break_step(self, table_file, games_file, expected_result_file):
        table = pd.read_csv(BASE / table_file)
        games = pd.read_csv(BASE / games_file)
        expected_result = pd.read_csv(BASE / expected_result_file)

        engine = TieBreakerEngine(LEAGUE_TABLE_TEST_RULESET)

        result = engine.rank(table, games)
        result = result.fillna(
            {
                "direct_wins": 0,
                "direct_point_diff": 0,
                "direct_points_scored": 0,
                "overall_point_diff": 0,
                "overall_points_scored": 0,
            }
        )

        assert result.to_csv() == expected_result.to_csv()


class TestLeagueRankingEngine:
    def test_league_ranking_engine_with_league_points(self):
        custom_ruleset = LeagueConfigRuleset(
            league_points=LeaguePoints(
                max_points_other_league=4.0,
                max_points_same_league=2.0,
                points_draw_other_league=1.0,
                points_draw_same_league=0.5,
                points_win_other_league=4.0,
                points_win_same_league=2.0,
                points_loss_same_league=-1.0,
                points_loss_other_league=0,
            ),
            league_quotient_precision=LEAGUE_TABLE_TEST_RULESET.league_quotient_precision,
            tie_break_order=LEAGUE_TABLE_TEST_RULESET.tie_break_order,
        )

        league_config = LeagueConfig(
            ruleset=custom_ruleset,
            team_point_adjustments_map=[],
            excluded_gameday_ids=[],
            leagues_for_league_points_ids=[],
            group_by_leagues=False,
        )

        games = pd.read_csv(BASE / "../league_ranking/league_ranking_games.csv")
        expected_result = pd.read_csv(
            BASE / "../league_ranking/league_ranking_table_expected.csv"
        )

        engine = LeagueRankingEngine(league_config)
        result = engine.compute_league_table(games)
        assert result.to_csv() == expected_result.to_csv()

    def test_league_ranking_engine_with_team_point_adjustments(self):
        custom_ruleset = LeagueConfigRuleset(
            league_points=LEAGUE_TABLE_TEST_RULESET.league_points,
            tie_break_order=LEAGUE_TABLE_TEST_RULESET.tie_break_order,
            league_quotient_precision=1,
        )

        league_config = LeagueConfig(
            ruleset=custom_ruleset,
            team_point_adjustments_map=[
                {
                    "id": 1,
                    "name": "Team A",
                    "points": "7",
                    "field": "league_points",
                },
                {
                    "id": 4,
                    "name": "Team D",
                    "points": "-5",
                    "field": "league_points",
                },
            ],
            excluded_gameday_ids=[],
            leagues_for_league_points_ids=[],
            group_by_leagues=False,
        )

        games = pd.read_csv(BASE / "../league_ranking/league_ranking_games.csv")
        expected_result = pd.read_csv(
            BASE
            / "../league_ranking/league_ranking_table_expected_with_point_adjustments.csv"
        )

        engine = LeagueRankingEngine(league_config)
        result = engine.compute_league_table(games)
        assert result.to_csv() == expected_result.to_csv()

    def test_league_quotient_precision(self):
        games = pd.read_csv(
            BASE / "../league_ranking/league_ranking_games_for_quotient_precision.csv"
        )
        expected_result = pd.read_csv(
            BASE
            / "../league_ranking/league_ranking_games_for_quotient_precision_table_expected.csv"
        )

        engine = LeagueRankingEngine(LEAGUE_TABLE_TEST_LEAGUE_CONFIG)
        result = engine.compute_league_table(games)
        assert result.to_csv() == expected_result.to_csv()

    def test_league_quotient_precision(self):
        games = pd.read_csv(
            BASE / "../league_ranking/league_ranking_games_for_quotient_precision.csv"
        )
        expected_result = pd.read_csv(
            BASE
            / "../league_ranking/league_ranking_games_for_quotient_precision_table_expected.csv"
        )

        engine = LeagueRankingEngine(LEAGUE_TABLE_TEST_LEAGUE_CONFIG)
        result = engine.compute_league_table(games)
        assert result.to_csv() == expected_result.to_csv()
