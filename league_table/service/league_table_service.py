from typing import Any

import pandas as pd
from django.db.models import QuerySet, F

from gamedays.models import Gameresult, SeasonLeagueTeam
from league_table.models import LeagueSeasonConfig
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

LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS = ["teams__id", "league_id", "teams__description", "league__name"]


class LeagueTableService:

    def __init__(self, league_season_config: LeagueSeasonConfig | None):
        self.league_season_config = league_season_config

    @classmethod
    def from_league_and_season(cls, league_slug: str, season_slug: str) -> "LeagueTableService":
        try:
            league_season_config = LeagueTableRepository.get_league_season_config(
                league_slug, season_slug
            )
            return cls(league_season_config)
        except LeagueSeasonConfig.DoesNotExist:
            return cls(None)

    def get_standing(self):
        try:
            if self.league_season_config is None:
                raise LeagueSeasonConfig.DoesNotExist
            league_config = LeagueConfig.from_league_season_config(self.league_season_config)
            current_season = self.league_season_config.season
            results = (
                Gameresult.objects.filter(
                    gameinfo__gameday__season=current_season,
                    gameinfo__gameday__league=self.league_season_config.league,
                    gameinfo__status="beendet",
                )
                # .exclude(gameinfo__gameday__gte=627)
                .exclude(gameinfo__gameday__in=league_config.excluded_gameday_ids)
                .select_related("gameinfo", "team")
                .values(*LEAGUE_TABLE_GAME_COLUMNS)
            )
            team_and_league_ids = (
                SeasonLeagueTeam.objects.filter(
                    season=current_season,
                    league__in=league_config.leagues_for_league_points_ids,
                )
                .values(*LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS)
                .annotate(
                    team_id=F("teams__id"), team__description=F("teams__description")
                )
            )
            if not team_and_league_ids.exists():
                raise SeasonLeagueTeam.DoesNotExist
            games_with_results = self._get_games_with_results_as_dataframe(
                results, team_and_league_ids
            )
            engine = LeagueRankingEngine(league_config)
            league_table = engine.compute_league_table(games_with_results)

            tb_engine = TieBreakerEngine(league_config.ruleset)
            final_league_table = tb_engine.rank(league_table, games_with_results)

        except (SeasonLeagueTeam.DoesNotExist, LeagueSeasonConfig.DoesNotExist):
            final_league_table = pd.DataFrame()
            final_league_table["standing"] = None
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
            return self._init_df_with_default_values(df)

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
        df_empty = self._init_df_with_default_values(df_empty)
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

    def _init_df_with_default_values(self, df) -> Any:
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
        df["gameinfo__standing"] = "Initial"

        df["league__name"] = "Initial"
        df["opponent_team_id"] = df["team_id"]
        df["opponent_league_id"] = df["league_id"]

        return df

    def _get_all_teams_df(self, team_and_league_ids: QuerySet) -> pd.DataFrame:
        df = pd.DataFrame(team_and_league_ids)

        if df.empty:
            # Should never happen unless config is broken
            return pd.DataFrame(columns=LEAGUE_TABLE_TEAM_AND_LEAGUE_COLUMNS)
        return df

    def get_all_schedules(self):
        # TODO
        return []

    def get_seasons_for_league_slug(self, league_slug) -> list[str]:
        return LeagueTableRepository.get_seasons_for_league_slug(
            league_slug
        )
