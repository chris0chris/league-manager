# gamedays/services/ranking/engine.py

import pandas as pd

from gamedays.service.gameday_settings import (
    POINTS,
    PF,
    PA,
    DIFF,
)
from league_table.models import LeagueRuleset
from league_table.service.datatypes import LeagueConfig
from league_table.service.ranking.tiebreakers import TieBreakerEngine


# from .tiebreakers import (
#     DirectComparisonTieBreaker,
#     PointDiffDirectTieBreaker,
#     PointsScoredDirectTieBreaker,
#     OverallPointDiffTieBreaker,
#     OverallPointsScoredTieBreaker,
#     NameAscendingTieBreaker,
# )
#
# # Map keys from ruleset.tie_break_order() to tie-breaker objects
# TIEBREAKER_REGISTRY = {
#     "direct_wins": DirectComparisonTieBreaker(),
#     "direct_point_diff": PointDiffDirectTieBreaker(),
#     "direct_points_scored": PointsScoredDirectTieBreaker(),
#     "overall_point_diff": OverallPointDiffTieBreaker(),
#     "overall_points_scored": OverallPointsScoredTieBreaker(),
#     "name_ascending": NameAscendingTieBreaker(),
# }


class FinalRankingEngine:
    def __init__(self, games_with_result: pd.DataFrame, schedule: pd.DataFrame):
        self.games = games_with_result
        self.schedule = schedule

    def _winner(self, row):
        """Return the winning team's name for a finished game."""
        if row["points_home"] > row["points_away"]:
            return row["home"]
        elif row["points_home"] < row["points_away"]:
            return row["away"]
        return None  # handle draws safely

    def _loser(self, row):
        """Return the losing team's name."""
        if row["points_home"] > row["points_away"]:
            return row["away"]
        elif row["points_home"] < row["points_away"]:
            return row["home"]
        return None  # handle draws safely

    def compute_final_table(self) -> pd.DataFrame:
        """Compute final standings based on actual playoff results."""
        # ensure all games finished
        if not self.games[self.games["status"] != "beendet"].empty:
            return pd.DataFrame()

        final_standing = []

        # define the expected placement games
        placements = ["P1", "P3", "P5", "P7", "P9", "P10"]
        for place in placements:
            games = self.schedule[self.schedule["standing"] == place]
            if games.empty:
                continue

            if len(games) == 1:
                # only one game, use current logic
                result_row = games.iloc[0]
                winner = self._winner(result_row)
                loser = self._loser(result_row)
                if not winner or not loser:
                    continue
                final_standing.append(winner)
                final_standing.append(loser)
            else:
                # multiple games: use tie-breaker engine to decide order
                # assume `TieBreakerEngine` can rank a subset of games
                # For example, we rank the teams based on the aggregate pf/pa/points
                subset_games = self.games[
                    self.games["gameinfo"].isin(games["gameinfo"])
                ]
                # Build a mini-standings table
                mini_table = subset_games.groupby("team__name", as_index=False).agg(
                    {POINTS: "sum", PF: "sum", PA: "sum", "standing": "first"}
                )
                mini_table[DIFF] = mini_table[PF] - mini_table[PA]

                # Sort using your tie-breaker logic (replace with your actual tie-breaker engine)
                # TODO make dynamic
                tie_breaker = TieBreakerEngine(
                    LeagueRuleset.objects.first()
                )  # or whatever engine you already have
                mini_table_sorted = tie_breaker.rank(mini_table, games)

                # Add sorted teams to final_standing
                final_standing.extend(mini_table_sorted["team__name"].tolist())

        # if some teams are not in playoffs, add them at the end
        all_teams = self.games["team__name"].unique().tolist()
        missing = [t for t in all_teams if t not in final_standing]
        final_standing += missing

        # aggregate basic stats for presentation
        table = self.games.groupby("team__name", as_index=False).agg(
            {POINTS: "sum", PF: "sum", PA: "sum"}
        )
        table[DIFF] = table[PF] - table[PA]
        table.set_index("team__name", inplace=True)
        table = table.reindex(final_standing).reset_index()

        return table


class LeagueRankingEngine:
    def __init__(self, league_config: LeagueConfig):
        self.league_config = league_config

    def compute_initial_stats(self, df) -> pd.DataFrame:
        """Return all finished games for the season+league with league-aware scoring."""

        df["league_points"] = df.apply(self._compute_league_points, axis=1)

        df["games_played"] = df["fh"].fillna(0).apply(lambda x: 1 if x >= 0 else 0)

        # max_league_points column
        df["max_league_points"] = self._compute_max_points(df)

        # diff column
        df["pf"] = df["fh"].fillna(0) + df["sh"].fillna(0)
        df["wins"] = df.apply(lambda r: 1 if r["pf"] > r["pa"] else 0, axis=1)
        df["draws"] = df.apply(lambda r: 1 if r["pf"] == r["pa"] else 0, axis=1)
        df["losses"] = df.apply(lambda r: 1 if r["pf"] < r["pa"] else 0, axis=1)
        df["diff"] = df["pf"] - df["pa"]

        return df

    def apply_team_point_adjustments(self, df: pd.DataFrame) -> pd.DataFrame:
        adjustments = self.league_config.team_point_adjustments_map

        if not adjustments:
            return df

        for adj in adjustments:
            team_id = adj["id"]
            points_delta = int(adj["points"])
            field = adj["field"]  # usually "points"

            # Safety checks
            if field not in df.columns:
                raise ValueError(f"Invalid adjustment field '{field}'")

            # Apply adjustment
            df.loc[df["team_id"] == team_id, field] += points_delta

        return df

    def compute_league_table(self, games_with_results: pd.DataFrame) -> pd.DataFrame:
        """Aggregate all game results into one final league table."""
        df_games = self.compute_initial_stats(games_with_results)
        if df_games.empty:
            return pd.DataFrame()

        df_games = df_games.rename(
            columns={
                "team__description": "team__name",
                "gameinfo__standing": "standing",
            }
        )

        table = df_games.groupby("team_id", as_index=False).agg(
            {
                "team__name": "first",
                "league_points": "sum",
                "max_league_points": "sum",
                "wins": "sum",
                "draws": "sum",
                "losses": "sum",
                "pf": "sum",
                "pa": "sum",
                "diff": "sum",
                "games_played": "count",
                "standing": "first",
            }
        )
        table = self.apply_team_point_adjustments(table)

        table["league_quotient"] = (table["league_points"] / table["max_league_points"]).round(
            self.league_config.ruleset.league_quotient_precision
        )

        return table

    def _compute_league_points(self, row):
        league_points = self.league_config.ruleset.league_points
        if row["pf"] > row["pa"]:
            return (
                league_points.points_win_same_league
                if row["league_id"] == row["opponent_league_id"]
                else league_points.points_win_other_league
            )
        elif row["pf"] == row["pa"]:
            return (
                league_points.points_draw_same_league
                if row["league_id"] == row["opponent_league_id"]
                else league_points.points_draw_other_league
            )
        else:
            return 0

    def _compute_max_points(self, df):
        league_points = self.league_config.ruleset.league_points
        return (df["league_id"] == df["opponent_league_id"]).map(
            {
                True: league_points.max_points_same_league,
                False: league_points.max_points_other_league,
            }
        )
