import pandas as pd
from pandas import DataFrame

from gamedays.models import Gameinfo, Gameresult

TEAM = 'team'
HOME = 'Heim'
AWAY = 'Gast'
POINTS = 'Punkte'
POINTS_HOME = POINTS + ' ' + HOME
POINTS_AWAY = POINTS + ' ' + AWAY
PF = 'pf'
PA = 'pa'
FH = 'fh'
SH = 'sh'
FIELD = 'field'
SCHEDULED = 'scheduled'
OFFICIALS = 'officials'
STAGE = 'stage'
STANDING = 'standing'
STATUS = 'status'


class GamedayModelWrapper:

    def __init__(self, pk):
        self._gameinfo: DataFrame = pd.DataFrame(Gameinfo.objects.filter(gameday_id=pk).values())
        if self._gameinfo.empty:
            raise Gameinfo.DoesNotExist

        gameresult = pd.DataFrame(Gameresult.objects.filter(gameinfo_id__in=self._gameinfo['id'].to_numpy()).values())
        if gameresult[gameresult[FH].notnull()].empty:
            gameresult = gameresult.fillna('')
        else:
            gameresult = gameresult.fillna(0).astype({FH: 'int32', SH: 'int32', PA: 'int32'})
        games_with_result = pd.merge(self._gameinfo, gameresult[gameresult[FH].notnull()], left_on='id',
                                     right_on='gameinfo_id')
        games_with_result['pf'] = games_with_result.fh + games_with_result.sh
        self._games_with_result: DataFrame = games_with_result

    def has_finalround(self):
        return True

    def get_schedule(self):
        home_teams = self._games_with_result.groupby('gameinfo_id').nth(0).reset_index()
        away_teams = self._games_with_result.groupby('gameinfo_id').nth(1).reset_index()
        home_teams = home_teams.rename(columns={TEAM: HOME, PF: POINTS_HOME})
        away_teams = away_teams.rename(columns={TEAM: AWAY, PF: POINTS_AWAY})
        away_teams = away_teams[[POINTS_AWAY, AWAY]]
        qualify_round = pd.concat([home_teams, away_teams], axis=1).sort_values(by=['field', 'scheduled'])

        schedule = self._gameinfo.merge(qualify_round, how='left')
        schedule = schedule.sort_values(by=[FIELD, SCHEDULED])
        schedule = schedule.sort_values(by='stage', ascending=False)
        schedule = schedule[
            [SCHEDULED, FIELD, OFFICIALS, STAGE, STANDING, HOME, POINTS_HOME, POINTS_AWAY, AWAY, STATUS]]
        schedule.fillna('', inplace=True)

        return schedule
