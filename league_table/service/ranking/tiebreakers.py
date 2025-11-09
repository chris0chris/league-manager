# tiebreakers.py
from typing import Callable, List

import pandas as pd


class TieBreaker:
    """Represents one tiebreak rule that can be applied to a DataFrame."""

    def __init__(
        self,
        key: str,
        func: Callable[[pd.DataFrame, pd.DataFrame], pd.Series],
        ascending: bool = False,
    ):
        self.key = key
        self.func = func
        self.ascending = ascending

    def apply(self, df: pd.DataFrame, games: pd.DataFrame) -> pd.Series:
        return self.func(df, games)

    def __repr__(self):
        return f"TieBreaker(key='{self.key}', func={self.func}, ascending={self.ascending})"


class TieBreakerEngine:
    """Executes a chain of tie-breakers based on a LeagueRuleset."""

    def __init__(self, ruleset):
        self.ruleset = ruleset
        self.tie_breakers = self._build_from_ruleset()

    def _build_from_ruleset(self) -> List[TieBreaker]:
        mapping = {
            "direct_wins": TieBreaker(
                "direct_wins", compute_direct_wins, ascending=False
            ),
            "direct_point_diff": TieBreaker(
                "direct_point_diff", compute_direct_point_diff, ascending=False
            ),
            "direct_points_scored": TieBreaker(
                "direct_points_scored", compute_direct_points_scored, ascending=False
            ),
            "overall_point_diff": TieBreaker(
                "overall_point_diff", compute_overall_point_diff, ascending=False
            ),
            "overall_points_scored": TieBreaker(
                "overall_points_scored", compute_overall_points_scored, ascending=False
            ),
            "name_ascending": TieBreaker(
                "name_ascending", compute_name_ascending, ascending=True
            ),
        }

        order = self.ruleset.tie_break_order()
        return [mapping[o] for o in order if o in mapping]

    def rank(self, standings_df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        """Sort standings by points first, then apply tie-breakers only within tied groups."""

        # Step 1: sort by points descending initially
        standings_df = standings_df.sort_values(
            by="points", ascending=False
        ).reset_index(drop=True)

        # Step 2: Prepare placeholders for tie-breaker columns
        for tb in self.tie_breakers:
            if tb.key not in standings_df.columns:
                standings_df[tb.key] = 0  # placeholder, will fill later

        # Step 3: Go through each group (e.g. group/standing) and tied points subset
        updated_rows = []

        for group_name, group_df in standings_df.groupby("standing"):
            # For each points value that occurs more than once
            for points_value, tied_df in group_df.groupby("points"):
                if len(tied_df) <= 1:
                    # no tie → skip
                    updated_rows.append(tied_df)
                    continue

                # Compute tie-breaker columns only for tied teams
                tied_teams = tied_df["team__name"].tolist()

                for tb in self.tie_breakers:
                    if tb.key == "direct_wins":
                        tied_df[tb.key] = compute_direct_wins(tied_df, games_df, tied_teams)
                    elif tb.key == "direct_point_diff":
                        tied_df[tb.key] = compute_direct_point_diff(tied_df, games_df, tied_teams)
                    elif tb.key == "direct_points_scored":
                        tied_df[tb.key] = compute_direct_points_scored(
                            tied_df, games_df, tied_teams
                        )
                    elif tb.key == "overall_point_diff":
                        tied_df[tb.key] = compute_overall_point_diff(tied_df, games_df, tied_teams)
                    elif tb.key == "overall_points_scored":
                        tied_df[tb.key] = compute_overall_points_scored(tied_df, games_df, tied_teams)
                    elif tb.key == "name_ascending":
                        tied_df[tb.key] = compute_name_ascending(tied_df, games_df, tied_teams)

                # Now sort the tied group using configured tiebreakers
                sort_keys = [tb.key for tb in self.tie_breakers]
                ascending_list = [tb.ascending for tb in self.tie_breakers]

                tied_df = tied_df.sort_values(
                    by=sort_keys, ascending=ascending_list, ignore_index=True
                )
                updated_rows.append(tied_df)

        # Step 4: Merge all groups back together and re-sort globally by points (and tiebreakers)
        sorted_df = pd.concat(updated_rows, ignore_index=True)

        sort_keys = ["points"] + [tb.key for tb in self.tie_breakers]
        ascending_list = [False] + [tb.ascending for tb in self.tie_breakers]
        sorted_df = sorted_df.sort_values(
            by=sort_keys, ascending=ascending_list, ignore_index=True
        )

        return sorted_df

    def rank2(self, standings_df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        """Sort the standings according to configured tie-breakers."""
        sort_keys = []
        ascending_list = []

        for tb in self.tie_breakers:
            sort_keys.append(tb.key)
            ascending_list.append(tb.ascending)

            if tb.key not in standings_df.columns:
                standings_df[tb.key] = tb.apply(standings_df, games_df)

        sorted_df = standings_df.sort_values(
            by=sort_keys, ascending=ascending_list, ignore_index=True
        )
        return sorted_df


# --- Example tie-breaker computations ---


def compute_direct_wins(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    """Compute number of wins against other tied teams in the same group."""
    direct_wins = {team_id: 0 for team_id in df["team__name"]}

    subset_games = games_df[
        (games_df["home"].isin(tied_teams)) &
        (games_df["away"].isin(tied_teams))
        ]

    for _, game in subset_games.iterrows():
        if game["points_home"] > game["points_away"]:
            direct_wins[game["home"]] += 1
        elif game["points_away"] > game["points_home"]:
            direct_wins[game["away"]] += 1

    return df["team__name"].map(direct_wins).fillna(0)


def compute_direct_point_diff(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    """Compute point difference (pf - pa) in matches between tied teams."""
    direct_diff = {team_id: 0 for team_id in df["team__name"]}



    subset_games = games_df[
        (games_df["home"].isin(tied_teams)) &
        (games_df["away"].isin(tied_teams))
        ]

    for _, game in subset_games.iterrows():
        direct_diff[game["home"]] += game["points_home"] - game["points_away"]
        direct_diff[game["away"]] += game["points_away"] - game["points_home"]

    return df["team__name"].map(direct_diff).fillna(0)


def compute_direct_points_scored(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    """Compute total points scored in matches between tied teams."""
    direct_points = {team_id: 0 for team_id in df["team__name"]}



    subset_games = games_df[
        (games_df["home"].isin(tied_teams)) &
        (games_df["away"].isin(tied_teams))
        ]

    for _, game in subset_games.iterrows():
        direct_points[game["home"]] += game["points_home"]
        direct_points[game["away"]] += game["points_away"]

    return df["team__name"].map(direct_points).fillna(0)


def compute_overall_point_diff(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["pf"] - df["pa"]


def compute_overall_points_scored(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["pf"]


def compute_name_ascending(df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]) -> pd.Series:
    return df["team__name"].str.lower()
