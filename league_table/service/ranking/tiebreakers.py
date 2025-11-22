# tiebreakers.py
from typing import Callable

import pandas as pd

from league_table.service.datatypes import LeagueConfigRuleset

TIEBREAK_REGISTRY = {}

def register_tiebreak(key):
    def wrapper(func):
        TIEBREAK_REGISTRY[key] = func
        return func
    return wrapper


class TieBreaker:
    """Represents one tiebreak rule that can be applied to a DataFrame."""

    def __init__(
        self,
        key: str,
        func: Callable[[pd.DataFrame, pd.DataFrame, list[int]], pd.Series],
        ascending: bool = False,
    ):
        self.key = key
        self.func = func
        self.ascending = ascending

    def apply(self, df: pd.DataFrame, games: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
        return self.func(df, games, tied_teams)

    def __repr__(self):
        return f"TieBreaker(key='{self.key}', func={self.func}, ascending={self.ascending})"


class TieBreakerEngine:
    """Executes a chain of tie-breakers based on a LeagueRuleset."""

    def __init__(self, ruleset: LeagueConfigRuleset):
        self.ruleset = ruleset
        self.tie_breakers = self._build_from_ruleset()

    def _build_from_ruleset(self):
        return [
            TieBreaker(
                key=step["key"],
                func=TIEBREAK_REGISTRY[step["key"]],
                ascending=step["is_ascending"],
            )
            for step in self.ruleset.tie_break_order
        ]

    def rank(self, standings_df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        """Sort standings by points first, then apply tie-breakers only within tied groups."""

        # Step 1: sort by points descending initially
        # standings_df = standings_df.sort_values(
        #     by="league_points", ascending=False
        # ).reset_index(drop=True)
        games_df = games_df.fillna({"fh": 0, "sh": 0, "pa": 0})

        # Step 2: Prepare placeholders for tie-breaker columns
        for tb in self.tie_breakers:
            if tb.key not in standings_df.columns:
                standings_df[tb.key] = 0  # placeholder, will fill later

        # Step 3: Go through each group (e.g. group/standing) and tied points subset
        updated_rows = []

        for group_name, group_df in standings_df.groupby("standing"):
            # For each points value that occurs more than once
            for points_value, tied_df in group_df.groupby("league_points"):
                if len(tied_df) <= 1:
                    # no tie → skip
                    updated_rows.append(tied_df)
                    continue

                # Compute tie-breaker columns only for tied teams
                tied_teams = tied_df["team_id"].tolist()

                for tb in self.tie_breakers:
                    tied_df[tb.key] = tb.apply(tied_df, games_df, tied_teams)

                # Now sort the tied group using configured tiebreakers
                sort_keys = [tb.key for tb in self.tie_breakers]
                ascending_list = [tb.ascending for tb in self.tie_breakers]

                tied_df = tied_df.sort_values(
                    by=sort_keys, ascending=ascending_list, ignore_index=True
                )
                updated_rows.append(tied_df)

        # Step 4: Merge all groups back together and re-sort globally by points (and tiebreakers)
        sorted_df = pd.concat(updated_rows, ignore_index=True)

        sort_keys = [tb.key for tb in self.tie_breakers]
        ascending_list = [tb.ascending for tb in self.tie_breakers]
        sorted_df = sorted_df.sort_values(
            by=["standing"] + sort_keys,
            ascending=[True] + ascending_list,
            ignore_index=True,
        )

        return sorted_df

@register_tiebreak("direct_wins")
def compute_direct_wins(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    """Compute number of wins against other tied teams in the same group."""
    direct_wins = {team_id: 0 for team_id in df["team_id"]}

    subset_games = games_df.groupby("gameinfo").filter(
        lambda g: len(g) == 2 and set(g["team_id"]).issubset(set(tied_teams))
    )

    for _, game in subset_games.iterrows():
        if game["fh"] + game["sh"] > game["pa"]:
            direct_wins[game["team_id"]] += 1

    return df["team_id"].map(direct_wins).fillna(0)

@register_tiebreak("direct_point_diff")
def compute_direct_point_diff(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    """Compute point difference (pf - pa) in matches between tied teams."""
    direct_diff = {team_id: 0 for team_id in df["team_id"]}

    subset_games = games_df.groupby("gameinfo").filter(
        lambda g: len(g) == 2 and set(g["team_id"]).issubset(set(tied_teams))
    )

    for _, game in subset_games.iterrows():
        direct_diff[game["team_id"]] += game["fh"] + game["sh"] - game["pa"]

    return df["team_id"].map(direct_diff).fillna(0)

@register_tiebreak("direct_points_scored")
def compute_direct_points_scored(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    """Compute total points scored in matches between tied teams."""
    direct_points = {team_id: 0 for team_id in df["team_id"]}

    subset_games = games_df.groupby("gameinfo").filter(
        lambda g: len(g) == 2 and set(g["team_id"]).issubset(set(tied_teams))
    )

    for _, game in subset_games.iterrows():
        direct_points[game["team_id"]] += game["fh"] + game["sh"]

    return df["team_id"].map(direct_points).fillna(0)

@register_tiebreak("overall_point_diff")
def compute_overall_point_diff(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["pf"] - df["pa"]

@register_tiebreak("overall_points_scored")
def compute_overall_points_scored(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["pf"]

@register_tiebreak("league_points")
def compute_league_points(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["league_points"]


@register_tiebreak("name_ascending")
def compute_name_ascending(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["team__name"].str.lower()
