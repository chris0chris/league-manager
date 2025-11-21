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

    def _get_games_with_results(self, df) -> pd.DataFrame:
        """Return all finished games for the season+league with league-aware scoring."""

        # Compute pf

        # TODO make this dynamic
        # Merge league info

        # Get opponent league
        # First pivot to get opponent for same gameinfo
        # drop self-merge

        # Compute Pts
        # TODO make this dynamic
        def compute_pts(row):
            if row["pf"] > row["pa"]:
                return 1 if row["league_id"] == row["opponent_league_id"] else 2
            elif row["pf"] == row["pa"]:
                return 0.5 if row["league_id"] == row["opponent_league_id"] else 1
            else:
                return 0

        df["win_points"] = df.apply(compute_pts, axis=1)

        # Compute p (1 if fh >= 0)
        df["games_played"] = df["fh"].fillna(0).apply(lambda x: 1 if x >= 0 else 0)

        # MaxPts column
        df["MaxPts"] = (df["league_id"] != df["opponent_league_id"]).apply(
            lambda x: 2 if x else 1
        )

        # diff column
        df["pf"] = df["fh"].fillna(0) + df["sh"].fillna(0)
        df["wins"] = df.apply(lambda r: 1 if r["pf"] > r["pa"] else 0, axis=1)
        df["draws"] = df.apply(lambda r: 1 if r["pf"] == r["pa"] else 0, axis=1)
        df["losses"] = df.apply(lambda r: 1 if r["pf"] < r["pa"] else 0, axis=1)
        df["diff"] = df["pf"] - df["pa"]

        return df

    def compute_league_table(self, games_with_results: pd.DataFrame) -> pd.DataFrame:
        """Aggregate all game results into one final league table."""
        df = self._get_games_with_results(games_with_results)
        if df.empty:
            return pd.DataFrame()

        df = df.rename(
            columns={
                "team__description": "team__name",
                "gameinfo__standing": "standing",
            }
        )

        table = df.groupby("team_id", as_index=False).agg(
            {
                "team__name": "first",
                "win_points": "sum",
                "MaxPts": "sum",
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
        table["league_points"] = table["win_points"] / table["MaxPts"]

        return table
