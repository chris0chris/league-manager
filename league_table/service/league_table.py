import json

import pandas as pd

from gamedays.models import Gameday, Gameinfo
from gamedays.service.gameday_settings import TEAM, PF, POINTS, PA, DIFF
from gamedays.service.model_wrapper import GamedayModelWrapper


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self):
        all_gamedays = Gameday.objects.filter(date__gte='2020-01-01', date__lte='2020-12-31')
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
        print(json.dumps(json.loads(table_standings.to_json(orient='table')), indent=2))
        return table_standings


    def _calculate_standings(self, all_standings):
        all_standings = all_standings.groupby([TEAM], as_index=False)
        all_standings = all_standings.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        all_standings = all_standings.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        return all_standings
