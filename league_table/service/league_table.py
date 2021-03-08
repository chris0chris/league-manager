import datetime
import json

import pandas as pd

from gamedays.service.gameday_settings import TEAM_NAME, PF, POINTS, PA, DIFF, DFFL
from gamedays.service.model_wrapper import GamedayModelWrapper
from teammanager.models import Gameday, Gameinfo, SeasonLeagueTeam


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self, season=None, league=None):
        if season is None:
            season = datetime.date.today().year
        year_as_str = str(season)
        start_date = f'{year_as_str}-01-01'
        end_date = f'{year_as_str}-12-31'
        all_gamedays = Gameday.objects.filter(date__gte=start_date, date__lte=end_date)
        all_standings = pd.DataFrame()
        for gameday in all_gamedays:
            try:
                gmw = GamedayModelWrapper(gameday.pk)
                all_standings = all_standings.append(gmw.get_final_table(), ignore_index=True)
            except Gameinfo.DoesNotExist:
                pass
        if all_standings.empty:
            return all_standings

        table_standings = self._calculate_standings(all_standings)
        if league is not None:
            season_league_team_mapping = pd.DataFrame(
                SeasonLeagueTeam.objects.filter(season__name=season, league__name=league).values('team__name'))
            if season_league_team_mapping.empty:
                return season_league_team_mapping
            table_standings = pd.merge(table_standings, season_league_team_mapping, how='right')
        print(json.dumps(json.loads(table_standings.to_json(orient='table')), indent=2))
        return table_standings


    def _calculate_standings(self, all_standings):
        all_standings = all_standings.groupby([TEAM_NAME], as_index=False)
        all_standings = all_standings.agg({DFFL: 'sum', POINTS: 'sum', PF: 'sum', PA: 'sum', DIFF: 'sum',
                                           })
        all_standings = all_standings.sort_values(by=[DFFL, POINTS, DIFF, PF, PA], ascending=False)
        return all_standings
