import datetime
import json

import pandas as pd

from gamedays.service.gameday_settings import TEAM_NAME, PF, POINTS, PA, DIFF, DFFL, DIVISION_NAME
from gamedays.service.model_wrapper import GamedayModelWrapper
from teammanager.models import Gameday, Gameinfo


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self, year=None, division=None):
        if year is None:
            year = datetime.date.today().year
        year_as_str = str(year)
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
            return []

        table_standings = self._calculate_standings(all_standings)
        if division is not None:
            table_standings = table_standings[table_standings[DIVISION_NAME] == division]
        print(json.dumps(json.loads(table_standings.to_json(orient='table')), indent=2))
        return table_standings


    def _calculate_standings(self, all_standings):
        all_standings = all_standings.groupby([TEAM_NAME], as_index=False)
        all_standings = all_standings.agg({DFFL: 'sum', POINTS: 'sum', PF: 'sum', PA: 'sum', DIFF: 'sum',
                                           DIVISION_NAME: 'first'})
        all_standings = all_standings.sort_values(by=[DFFL, POINTS, DIFF, PF, PA], ascending=False)
        return all_standings
