import pathlib

import pandas as pd
import pytest

from league_table.service.datatypes import LeagueConfigRuleset, LeagueConfig
from league_table.service.ranking.engine import LeagueRankingEngine
from league_table.service.ranking.tiebreakers import TieBreakerEngine

BASE = pathlib.Path(__file__).parent / "testdata/tiebreak"


RULESET = LeagueConfigRuleset(
    league_points_map={},
    tie_break_order=[
        {"is_ascending": False, "key": "win_points"},
        {"is_ascending": False, "key": "direct_wins"},
        {"is_ascending": False, "key": "direct_point_diff"},
        {"is_ascending": False, "key": "direct_points_scored"},
        {"is_ascending": False, "key": "overall_point_diff"},
        {"is_ascending": False, "key": "overall_points_scored"},
        {"is_ascending": True, "key": "name_ascending"},
    ],
    game_points_map={"draw_points": 1.0, "loss_points": 0.0, "win_points": 2.0},
    excluded_league_id=0,
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
    def test(self):
        custom_ruleset = LeagueConfigRuleset(
            league_points_map={
                "max_points_other_league": 2.0,
                "max_points_same_league": 1.0,
                "points_draw_other_league": 1.0,
                "points_draw_same_league": 0.5,
                "points_win_other_league": 2.0,
                "points_win_same_league": 1.0,
            },
            tie_break_order=RULESET.tie_break_order,
            game_points_map=RULESET.game_points_map,
            excluded_league_id=RULESET.excluded_league_id,
        )

        league_config = LeagueConfig(
            ruleset=custom_ruleset,
            team_point_adjustments_map=[],
            excluded_gameday_ids=[],
        )

        games = pd.read_csv(BASE / "../league_ranking/league_ranking_games.csv")
        expected_result = pd.read_csv(BASE / "../league_ranking/league_ranking_table_expected.csv")

        engine = LeagueRankingEngine(league_config)
        result = engine.compute_league_table(games)
        assert result.to_csv() == expected_result.to_csv()
