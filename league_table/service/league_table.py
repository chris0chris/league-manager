import json

import pandas as pd

from gamedays.models import Season, SeasonLeagueTeam, Gameday, Gameinfo
from gamedays.service.gameday_settings import (
    SCHEDULED,
    OFFICIALS_NAME,
    STAGE,
    STANDING,
    HOME,
    AWAY,
    TEAM_NAME,
    POINTS,
    PF,
    PA,
    DIFF,
    DFFL,
    GAMEDAY_NAME,
    GAMEDAY_ID,
    GAMEINFO_ID,
)
from gamedays.service.model_wrapper import GamedayModelWrapper


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self, season=None, league=None):
        if season is None:
            season = Season.objects.last()
        all_gamedays = Gameday.objects.filter(season__name=season)
        all_standings = pd.DataFrame()
        for gameday in all_gamedays:
            try:
                gmw = GamedayModelWrapper(gameday.pk)
                all_standings = pd.concat(
                    [all_standings, gmw.get_final_table()], ignore_index=True
                )
            except Gameinfo.DoesNotExist:
                pass
        if all_standings.empty:
            return all_standings

        table_standings = self._calculate_standings(all_standings)
        if league is not None:
            season_league_team_mapping = pd.DataFrame(
                SeasonLeagueTeam.objects.filter(
                    season__name__iexact=season, league__name__iexact=league
                ).values(TEAM_NAME)
            )
            if season_league_team_mapping.empty:
                return season_league_team_mapping
            table_standings = pd.merge(
                table_standings, season_league_team_mapping, how="right"
            )
        print(json.dumps(json.loads(table_standings.to_json(orient="table")), indent=2))
        return table_standings

    def _calculate_standings(self, all_standings):
        all_standings = all_standings.groupby([TEAM_NAME], as_index=False)
        all_standings = all_standings.agg(
            {
                DFFL: "sum",
                POINTS: "sum",
                PF: "sum",
                PA: "sum",
                DIFF: "sum",
            }
        )
        all_standings = all_standings.sort_values(
            by=[DFFL, POINTS, DIFF, PF, PA], ascending=False
        )
        return all_standings

    def get_all_schedules(self):
        season = Season.objects.last()
        all_gamedays = Gameday.objects.filter(season__name=season)
        all_schedules = pd.DataFrame()
        for gameday in all_gamedays:
            try:
                gmw = GamedayModelWrapper(
                    gameday.pk, ["gameday__name", "gameday__date"]
                )
                all_schedules = all_schedules.append(
                    gmw.get_schedule(), ignore_index=True
                )
            except Gameinfo.DoesNotExist:
                pass
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
        return all_schedules[columns]
