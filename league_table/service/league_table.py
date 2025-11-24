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
]

LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS = ["team_id", "league_id"]


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self, league_slug: str, season_slug: str):
        # TODO config für LeasgueSeasonConfig
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
            # .exclude(gameinfo__gameday__gte=421)
            .exclude(gameinfo__gameday__in=league_config.excluded_gameday_ids)
            .select_related("gameinfo", "team")
            .values(*LEAGUE_TABLE_GAME_COLUMNS)
        )
        unique_team_ids = results.values_list("team_id", flat=True).distinct()
        team_and_league_ids = (
            SeasonLeagueTeam.objects.filter(
                season=current_season, team__in=unique_team_ids
            )
            .exclude(league=league_config.ruleset.excluded_league_id)
            .values(*LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS)
        )
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
        df = pd.DataFrame(list(results))
        if df.empty:
            df = pd.DataFrame(columns=LEAGUE_TABLE_GAME_COLUMNS)

        df["pf"] = df["fh"].fillna(0) + df["sh"].fillna(0)

        team_assoc = pd.DataFrame(team_and_league_ids)
        if team_assoc.empty:
            team_assoc = pd.DataFrame(columns=LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS)
        df = df.merge(
            team_assoc,
            left_on="team_id",
            right_on="team_id",
            how="left",
            suffixes=("", "_team"),
        )

        df_opponent = df[["gameinfo", "team_id", "league_id"]].copy()
        df_opponent = df_opponent.rename(
            columns={
                "team_id": "opponent_team_id",
                "league_id": "opponent_league_id",
            }
        )

        df = df.merge(df_opponent, on="gameinfo", how="left")
        df = df[df["team_id"] != df["opponent_team_id"]]
        return df

    def get_all_schedules(self):
        # TODO
        return []
