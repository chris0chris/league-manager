import pathlib

import pandas as pd
import pytest

from league_table.service.datatypes import (
    LeagueConfigRuleset,
    LeagueConfig,
    LeaguePoints,
)
from league_table.service.ranking.engine import LeagueRankingEngine
from league_table.service.ranking.tiebreakers import TieBreakerEngine

BASE = pathlib.Path(__file__).parent / "testdata/tiebreak"


RULESET = LeagueConfigRuleset(
    league_points=LeaguePoints(
        max_points_other_league=2.0,
        max_points_same_league=1.0,
        points_draw_other_league=1.0,
        points_draw_same_league=0.5,
        points_win_other_league=2.0,
        points_win_same_league=1.0,
    ),
    tie_break_order=[
        {"is_ascending": False, "key": "league_points"},
        {"is_ascending": False, "key": "direct_wins"},
        {"is_ascending": False, "key": "direct_point_diff"},
        {"is_ascending": False, "key": "direct_points_scored"},
        {"is_ascending": False, "key": "overall_point_diff"},
        {"is_ascending": False, "key": "overall_points_scored"},
        {"is_ascending": True, "key": "name_ascending"},
    ],
    excluded_league_id=0,
    league_quotient_precision=3
)

LEAGUE_CONFIG = LeagueConfig(
    ruleset=RULESET,
    team_point_adjustments_map=[],
    excluded_gameday_ids=[],
)


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
        ],
        ids=[
            "direct_points_diff",
            "direct_points_scored",
            "overall_points_diff",
            "overall_points_scored",
            "name",
            "initial_empty_table_and_empty_games",
        ],
    )
    def test_run_tie_break_step(self, table_file, games_file, expected_result_file):
        table = pd.read_csv(BASE / table_file)
        games = pd.read_csv(BASE / games_file)
        expected_result = pd.read_csv(BASE / expected_result_file)

        engine = TieBreakerEngine(RULESET)
        result = engine.rank(table, games)

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
            ),
            league_quotient_precision=RULESET.league_quotient_precision,
            tie_break_order=RULESET.tie_break_order,
            excluded_league_id=RULESET.excluded_league_id,
        )

        league_config = LeagueConfig(
            ruleset=custom_ruleset,
            team_point_adjustments_map=[],
            excluded_gameday_ids=[],
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
            league_points=RULESET.league_points,
            tie_break_order=RULESET.tie_break_order,
            excluded_league_id=RULESET.excluded_league_id,
            league_quotient_precision=1
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
        games = pd.read_csv(BASE / "../league_ranking/league_ranking_games_for_quotient_precision.csv")
        expected_result = pd.read_csv(
            BASE
            / "../league_ranking/league_ranking_games_for_quotient_precision_table_expected.csv"
        )

        engine = LeagueRankingEngine(LEAGUE_CONFIG)
        result = engine.compute_league_table(games)
        assert result.to_csv() == expected_result.to_csv()

