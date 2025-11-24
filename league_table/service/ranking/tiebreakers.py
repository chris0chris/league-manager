from typing import Callable

import pandas as pd

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

    def apply(
        self, df: pd.DataFrame, games: pd.DataFrame, tied_teams: list[int]
    ) -> pd.Series:
        return self.func(df, games, tied_teams)

    def __repr__(self):
        return f"TieBreaker(key='{self.key}', func={self.func}, ascending={self.ascending})"


def _subset_direct_games(games_df: pd.DataFrame, tied_teams: list[int]) -> pd.DataFrame:
    """Return only the games played between the tied teams."""
    tied = set(tied_teams)
    return games_df.groupby("gameinfo").filter(
        lambda g: len(g) == 2 and set(g["team_id"]).issubset(tied)
    )


def _map_direct_metric(df: pd.DataFrame, subset: pd.DataFrame, compute_fn) -> pd.Series:
    """
    Reusable mapper:
    compute_fn(game_row) returns numerical contribution for that team.
    """
    result = {team_id: 0 for team_id in df["team_id"]}

    for _, game in subset.iterrows():
        result[game["team_id"]] += compute_fn(game)

    return df["team_id"].map(result).fillna(0)


@register_tiebreak("direct_wins")
def compute_direct_wins(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Count wins against tied teams."""
    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(
        df, subset, lambda g: 1 if (g["fh"] + g["sh"]) > g["pa"] else 0
    )


@register_tiebreak("direct_wins")
def compute_direct_wins2(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Count wins against tied teams."""
    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(
        df, subset, lambda g: 1 if (g["fh"] + g["sh"]) > g["pa"] else 0
    )


@register_tiebreak("direct_point_diff")
def compute_direct_point_diff(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Sum point diff vs tied teams."""
    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(df, subset, lambda g: (g["fh"] + g["sh"]) - g["pa"])


@register_tiebreak("direct_points_scored")
def compute_direct_points_scored(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Sum points scored vs tied teams."""
    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(df, subset, lambda g: g["fh"] + g["sh"])


@register_tiebreak("overall_point_diff")
def compute_overall_point_diff(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df["pf"] - df["pa"]


@register_tiebreak("overall_points_scored")
def compute_overall_points_scored(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df["pf"]


@register_tiebreak("league_points")
def compute_league_points(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df["league_points"]


@register_tiebreak("name_ascending")
def compute_name_ascending(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df["team__name"].str.lower()
