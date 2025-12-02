from typing import Any

import pandas as pd
from django.db.models import QuerySet

from gamedays.models import Gameresult, SeasonLeagueTeam
from gamedays.service.gameday_settings import (
    SCHEDULED,
    OFFICIALS_NAME,
    STAGE,
    STANDING,
    HOME,
    AWAY,
    GAMEDAY_NAME,
    GAMEDAY_ID,
    GAMEINFO_ID,
)
from league_table.service.datatypes import LeagueConfig
from league_table.service.leaguetable_repository import LeagueTableRepository
from league_table.service.ranking.engine import LeagueRankingEngine, TieBreakerEngine

LEAGUE_TABLE_GAME_COLUMNS = [
    "gameinfo",
    "team_id",
    "team__description",
    "fh",
    "sh",
    "pa",
    "isHome",
    "gameinfo__standing",
    "gameinfo__status",
]

LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS = ["team_id", "league_id", "team__description"]


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self, league_slug: str, season_slug: str):
        league_season_config = LeagueTableRepository.get_league_season_config(
            league_slug, season_slug
        )
        league_config = LeagueConfig.from_league_season_config(league_season_config)
        current_season = league_season_config.season
        results = (
            Gameresult.objects.filter(
                gameinfo__gameday__season=current_season,
                gameinfo__gameday__league=league_season_config.league,
                gameinfo__status="beendet",
            )
            # .exclude(gameinfo__gameday__gte=428)
            .exclude(gameinfo__gameday__in=league_config.excluded_gameday_ids)
            .select_related("gameinfo", "team")
            .values(*LEAGUE_TABLE_GAME_COLUMNS)
        )
        team_and_league_ids = SeasonLeagueTeam.objects.filter(
            season=current_season,
            league__in=league_config.leagues_for_league_points_ids,
        ).values(*LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS)
        if not team_and_league_ids.exists():
            raise SeasonLeagueTeam.DoesNotExist
        games_with_results = self._get_games_with_results_as_dataframe(
            results, team_and_league_ids
        )
        engine = LeagueRankingEngine(league_config)
        league_table = engine.compute_league_table(games_with_results)

        tb_engine = TieBreakerEngine(league_config.ruleset)
        final_league_table = tb_engine.rank(league_table, games_with_results)

        columns = [
            GAMEDAY_NAME,
            GAMEDAY_ID,
            SCHEDULED,
            OFFICIALS_NAME,
            GAMEINFO_ID,
            HOME,
            AWAY,
            STANDING,
            STAGE,
        ]
        return final_league_table

    def _get_games_with_results_as_dataframe(
        self,
        results: QuerySet[Gameresult, dict[str, Any]],
        team_and_league_ids: QuerySet,
    ) -> pd.DataFrame:

        # Always start with all teams
        # teams_df = self._get_all_teams_df(team_and_league_ids)
        teams_df = pd.DataFrame(team_and_league_ids)

        results_df = pd.DataFrame(list(results))

        if results_df.empty:
            # No games played → return base team list only
            df = teams_df.copy()

            # Columns that must exist for the ranking engine
            df["pf"] = 0
            df["pa"] = 0
            df["diff"] = 0
            df["league_points"] = 0
            df["league_quotient"] = 0
            df["max_league_points"] = 0
            df["wins"] = 0
            df["draws"] = 0
            df["losses"] = 0
            df["games_played"] = 0

            # Game fields
            df["gameinfo"] = pd.NA
            df["fh"] = pd.NA
            df["sh"] = pd.NA
            df["isHome"] = pd.NA
            df["gameinfo__status"] = "Initial"
            df["gameinfo__standing"] = "Hauptrunde"

            # Opponent placeholders (never used, but required for consistency)
            df["opponent_team_id"] = df["team_id"]
            df["opponent_league_id"] = df["league_id"]

            return df

        # Compute PF/PA/etc.
        results_df["pf"] = (
            results_df["fh"].fillna(0) + results_df["sh"].fillna(0)
        ).astype(int)
        results_df["pa"] = results_df["pa"].fillna(0).astype(int)
        results_df["diff"] = results_df["pf"] - results_df["pa"]

        # Merge results ONTO teams
        merged = teams_df.merge(
            results_df,
            on="team_id",
            how="left",
            suffixes=("", "_game"),
        )

        df_empty = merged[merged["gameinfo"].isna()].copy()
        df_games = merged[merged["gameinfo"].notna()].copy()

        df_opponent = merged[["gameinfo", "team_id", "league_id"]].copy()
        df_opponent = df_opponent.rename(
            columns={
                "team_id": "opponent_team_id",
                "league_id": "opponent_league_id",
            }
        )

        df_games = df_games.merge(df_opponent, on="gameinfo", how="left")
        df_games = df_games[df_games["team_id"] != df_games["opponent_team_id"]]

        merged_final = pd.concat([df_empty, df_games], ignore_index=True)

        return merged_final

    def _get_all_teams_df(self, team_and_league_ids: QuerySet) -> pd.DataFrame:
        df = pd.DataFrame(team_and_league_ids)

        if df.empty:
            # Should never happen unless config is broken
            return pd.DataFrame(columns=LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS)
        return df

    def get_all_schedules(self):
        # TODO
        return []
