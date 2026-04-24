from typing import Callable

import pandas as pd

from gamedays.service.gameday_settings import (
    TEAM_DESCRIPTION,
    NAME_ASCENDING,
    WIN_QUOTIENT,
    PF,
    PA,
    FH,
    SH,
    TEAM_ID,
    GAMEINFO,
)

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
    """Return only the rows for games where BOTH participants are in the tied group."""
    tied_set = set(tied_teams)

    # We group by gameinfo and keep only the groups (games) where
    # both team_ids belong to our tied_set.
    return games_df.groupby(GAMEINFO).filter(
        lambda x: len(x) == 2 and set(x[TEAM_ID]).issubset(tied_set)
    )


def _all_played_each_other(games_df: pd.DataFrame, tied_teams: list[int]) -> bool:
    """
    Checks if every team in the tied group has played against every
    other team in the tied group at least once.
    """
    if len(tied_teams) <= 1:
        return True

    subset = _subset_direct_games(games_df, tied_teams)
    tied_set = set(tied_teams)

    for team in tied_teams:
        # Find all game IDs this specific team participated in WITHIN the tied subset
        team_game_ids = subset[subset[TEAM_ID] == team][GAMEINFO].unique()

        # Find all unique team_ids that appeared in those games
        participants = set(
            subset[subset[GAMEINFO].isin(team_game_ids)][TEAM_ID].unique()
        )

        # If the participants for this team don't cover the whole tied group, return False
        if not tied_set.issubset(participants):
            return False

    return True


def _map_direct_metric(df: pd.DataFrame, subset: pd.DataFrame, compute_fn) -> pd.Series:
    """
    Reusable mapper:
    compute_fn(game_row) returns numerical contribution for that team.
    """
    result = {team_id: 0 for team_id in df[TEAM_ID]}

    for _, game in subset.iterrows():
        result[game[TEAM_ID]] += compute_fn(game)

    return df[TEAM_ID].map(result).fillna(0)


@register_tiebreak("direct_wins")
def compute_direct_wins(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Count wins against tied teams, ONLY if all tied teams played each other."""
    if not _all_played_each_other(games_df, tied_teams):
        # Fall-through: give everyone 0 so this tiebreaker has no effect
        return pd.Series(0, index=df.index)

    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(
        df, subset, lambda g: 1 if (g[FH] + g[SH]) > g[PA] else 0
    )


@register_tiebreak("direct_point_diff")
def compute_direct_point_diff(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Sum point diff vs tied teams, ONLY if all tied teams played each other."""
    if not _all_played_each_other(games_df, tied_teams):
        return pd.Series(0, index=df.index)

    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(df, subset, lambda g: (g[FH] + g[SH]) - g[PA])


@register_tiebreak("direct_points_scored")
def compute_direct_points_scored(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    """Sum points scored vs tied teams, ONLY if all tied teams played each other."""
    if not _all_played_each_other(games_df, tied_teams):
        return pd.Series(0, index=df.index)

    subset = _subset_direct_games(games_df, tied_teams)
    return _map_direct_metric(df, subset, lambda g: g[FH] + g[SH])


@register_tiebreak("overall_point_diff")
def compute_overall_point_diff(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df[PF] - df[PA]


@register_tiebreak("overall_points_scored")
def compute_overall_points_scored(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df[PF]


@register_tiebreak(WIN_QUOTIENT)
def compute_league_quotient(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df[WIN_QUOTIENT]


@register_tiebreak(NAME_ASCENDING)
def compute_name_ascending(
    df: pd.DataFrame, games_df: pd.DataFrame, tied_teams: list[int]
) -> pd.Series:
    return df[TEAM_DESCRIPTION].str.lower()
