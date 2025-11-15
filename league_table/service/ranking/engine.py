# gamedays/services/ranking/engine.py

import pandas as pd

from gamedays.models import Season, League, Gameresult, SeasonLeagueTeam
from gamedays.service.gameday_settings import (
    POINTS,
    PF,
    PA,
    DIFF,
)
from league_table.models import LeagueRuleset, LeagueSeasonConfig
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


# @dataclass
# class RankingEngine:
#     ruleset: object  # your LeagueRuleset instance
#     games_df: (
#         pd.DataFrame
#     )  # raw games per-team rows (self._games_with_result in your wrapper)
#     team_table_df: (
#         pd.DataFrame
#     )  # aggregated table (one row per team) with required columns: team_name, points, pf, pa, diff
#
#     def rank(self) -> pd.DataFrame:
#         """
#         Return ranked table (DataFrame) according to ruleset.
#         Approach:
#           1. start with team_table_df sorted by primary keys (points, diff, pf, pa) descending
#           2. find tie groups (teams with equal primary sort key)
#           3. for each tie group, apply tie-breakers in configured order, generating sort keys
#           4. replace the tie group with newly-sorted order
#         """
#         df = self.team_table_df.copy()
#         # Ensure team_name exists
#         assert (
#             "team_name" in df.columns
#         ), "team_table_df must contain 'team_name' column"
#
#         # base sort (fallback)
#         base_sort_cols = ["points", "diff", "pf", "pa"]
#         present_base = [c for c in base_sort_cols if c in df.columns]
#         if not present_base:
#             raise ValueError(
#                 "team_table_df must contain at least one of points/diff/pf/pa"
#             )
#
#         # initial sort descending
#         df = df.sort_values(
#             by=present_base, ascending=[False] * len(present_base), ignore_index=True
#         )
#
#         # Find tie groups where all present_base columns are equal
#         # Build a key that concatenates the present base columns to find ties.
#         df["_tie_key"] = df[present_base].astype(str).agg("_".join, axis=1)
#
#         result_rows = []
#         i = 0
#         while i < len(df):
#             # gather contiguous group with same _tie_key
#             key = df.at[i, "_tie_key"]
#             group = df[df["_tie_key"] == key].copy()
#             idxs = group.index.tolist()
#             if len(group) == 1:
#                 result_rows.append(group.iloc[0])
#                 i = idxs[-1] + 1
#                 continue
#
#             # we have a tie group -> apply the rules
#             resolved = self._resolve_tie_group(group)
#             # resolved is DataFrame sorted according to rule application
#             for _, row in resolved.iterrows():
#                 result_rows.append(row)
#             i = idxs[-1] + 1
#
#         final = pd.DataFrame(result_rows).reset_index(drop=True)
#         # remove helper column if present
#         final.drop(
#             columns=[c for c in ["_tie_key"] if c in final.columns], inplace=True
#         )
#         return final
#
#     def _resolve_tie_group(self, group_df: pd.DataFrame) -> pd.DataFrame:
#         """
#         Apply tiebreakers to group_df (subset of teams). Return sorted group_df.
#         """
#         group = group_df.copy().reset_index(drop=True)
#         # Start by making a working_df that we will add columns to for sorting
#         working = group.copy()
#
#         # For direct comparison tie-breakers we need games among tied teams; prepare games_df with opponent_name
#         # Expect the self.games_df to contain one row per team per match, with team_name column and pf/pa/points
#         games = self.games_df.copy()
#         # construct opponent_name by merging game rows: assume games have game_id and each game has two rows (home/away)
#         if "game_id" in games.columns:
#             # pivot to get opponent_name next to each row
#             left = games.copy()
#             right = games.copy()
#             right = right.rename(
#                 columns={
#                     "team_name": "opponent_name",
#                     "pf": "opp_pf",
#                     "pa": "opp_pa",
#                     "points": "opp_points",
#                 }
#             )
#             merged = left.merge(
#                 right[["game_id", "opponent_name", "opp_pf", "opp_pa", "opp_points"]],
#                 on="game_id",
#                 how="left",
#                 suffixes=("", "_opp"),
#             )
#             # Now merged has team_name and opponent_name columns per-row
#             games = merged
#         else:
#             # If games_df already has opponent_name column, keep as is
#             if "opponent_name" not in games.columns:
#                 # if it's not possible to construct opponent_name, direct comparison tie-breakers may not work
#                 # but we'll still call tie-breakers which should handle missing data gracefully
#                 pass
#
#         # Apply tie-breakers in ruleset order; create a list of (col_name, ascending)
#         tie_order = self.ruleset.tie_break_order()
#         # Ensure final fallback name_ascending is present (if use_name_ascending true, ruleset already included)
#         sort_keys = []
#         ascending_flags = []
#         for key in tie_order:
#             tb = TIEBREAKER_REGISTRY.get(key)
#             if not tb:
#                 # unknown key: skip
#                 continue
#             res = tb.apply(working, games, self.ruleset)
#             # merge back result columns for sorting
#             # the tie-breaker returns a DataFrame with team_name and new columns
#             # Safe merge on team_name
#             working = working.merge(
#                 res.df[[col for col in res.df.columns if col != "team_name"]],
#                 left_on="team_name",
#                 right_index=False,
#                 right_on=None,
#                 how="left",
#                 copy=False,
#             )
#             # pick what to sort by:
#             if hasattr(tb, "key_name"):
#                 # Record sort column; name_ascending should be ascending True
#                 col = tb.key_name
#                 if col not in working.columns:
#                     continue
#                 sort_keys.append(col)
#                 if col == "name_ascending":
#                     ascending_flags.append(True)
#                 else:
#                     ascending_flags.append(False)
#
#         # Always ensure stable fallback: team_name ascending
#         if "team_name" not in sort_keys:
#             sort_keys.append("team_name")
#             ascending_flags.append(True)
#
#         # Now sort the working group by the computed keys:
#         # Fill NaNs for sorting
#         working.fillna(
#             {
#                 k: ("" if isinstance(k, str) and k == "team_name" else 0)
#                 for k in working.columns
#             },
#             inplace=True,
#         )
#         working = working.sort_values(
#             by=sort_keys, ascending=ascending_flags, ignore_index=True
#         )
#
#         # Only return columns present in original group, plus useful metrics (keep everything for debug)
#         return working

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
                tie_breaker = (
                    TieBreakerEngine(LeagueRuleset.objects.first())
                )  # or whatever engine you already have
                mini_table_sorted = tie_breaker.rank(mini_table, games)

                # Add sorted teams to final_standing
                final_standing.extend(mini_table_sorted["team__name"].tolist())

        # if some teams are not in playoffs, add them at the end
        all_teams = self.games["team__name"].unique().tolist()
        missing = [t for t in all_teams if t not in final_standing]
        final_standing += missing

        # aggregate basic stats for presentation
        table = (
            self.games.groupby("team__name", as_index=False)
            .agg({POINTS: "sum", PF: "sum", PA: "sum"})
        )
        table[DIFF] = table[PF] - table[PA]
        table.set_index("team__name", inplace=True)
        table = table.reindex(final_standing).reset_index()

        return table


class LeagueRankingEngine:
    def __init__(self, season: Season, league: League):
        self.season = season
        self.league = league


    def _get_games_with_results(self) -> pd.DataFrame:
        """Return all finished games for the season+league with league-aware scoring."""
        results = (
            Gameresult.objects.filter(
                gameinfo__gameday__season=self.season,
                gameinfo__gameday__league=self.league,
                gameinfo__status="beendet",
                # TODO make this dynamic
                gameinfo__gameday__lt=603,
                # gameinfo__gameday__gt=608,
            )
            .select_related("gameinfo", "team")
            .values(
                "gameinfo",
                "team_id",
                "team__description",
                "fh",
                "sh",
                "pa",
                "isHome",
                "gameinfo__standing",
            )
        )

        df = pd.DataFrame(list(results))
        if df.empty:
            return df

        # Compute pf
        df["pf"] = df["fh"].fillna(0) + df["sh"].fillna(0)

        # TODO make this dynamic
        # Merge league info
        team_assoc = pd.DataFrame(
            SeasonLeagueTeam.objects.filter(
                season=self.season, team__in=df["team_id"].unique()
            ).exclude(league=7).values("team_id", "league_id")
        )
        df = df.merge(
            team_assoc,
            left_on="team_id",
            right_on="team_id",
            how="left",
            suffixes=("", "_team"),
        )

        # Get opponent league
        # First pivot to get opponent for same gameinfo
        df_opponent = df[["gameinfo", "team_id", "league_id"]].copy()
        df_opponent = df_opponent.rename(
            columns={
                "team_id": "opponent_team_id",
                "league_id": "opponent_league_id",
            }
        )

        df = df.merge(df_opponent, on="gameinfo", how="left")
        df = df[df["team_id"] != df["opponent_team_id"]]  # drop self-merge

        # Compute Pts
        # TODO make this dynamic
        def compute_pts(row):
            if row["pf"] > row["pa"]:
                return 1 if row["league_id"] == row["opponent_league_id"] else 2
            elif row["pf"] == row["pa"]:
                return 0.5 if row["league_id"] == row["opponent_league_id"] else 1
            else:
                return 0

        df["points"] = df.apply(compute_pts, axis=1)

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

    def compute_league_table(self) -> pd.DataFrame:
        """Aggregate all game results into one final league table."""
        df = self._get_games_with_results()
        if df.empty:
            return pd.DataFrame()

        df = df.rename(columns={"team__description": "team__name", "gameinfo__standing": "standing"})

        table = (
            df.groupby("team__name", as_index=False)
            .agg(
                {
                    "points": "sum",
                    "MaxPts": "first",
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
        )
        table["siegquotient"] = table["points"] / table["MaxPts"]
        # TODO config ob Gruppen- oder Hauptrundentabelle
        table["standing"] = "Hauptrunde"

        # sort by points, point diff, points for, points against
        table = table.sort_values(
            by=["points", "diff", "pf", "pa"], ascending=[False, False, False, True]
        ).reset_index(drop=True)

        tb_engine = TieBreakerEngine(
            LeagueSeasonConfig.objects.get(
                league=self.league, season=self.season
            ).ruleset
        )
        table = tb_engine.rank(table, df)

        table["rank"] = range(1, len(table) + 1)
        return table

    def compute_league_table2(self) -> pd.DataFrame:
        """Aggregate all game results into one final league table."""
        df = self._get_games_with_results()
        if df.empty:
            return pd.DataFrame()

        table = (
            df.groupby("team__description", as_index=False)
            .agg(
                {
                    "points": "sum",
                    "MaxPts": "first",
                    "wins": "sum",
                    "draws": "sum",
                    "losses": "sum",
                    "pf": "sum",
                    "pa": "sum",
                    "diff": "sum",
                    "games_played": "count",
                }
            )
            .rename(columns={"gameinfo": "games_played"})
        )
        table["siegquotient"] = table["Pts"] / table["MaxPts"]

        # sort by points, point diff, points for, points against
        table = table.sort_values(
            by=["points", "diff", "pf", "pa"], ascending=[False, False, False, True]
        ).reset_index(drop=True)

        table["rank"] = range(1, len(table) + 1)
        return table
