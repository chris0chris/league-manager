import numpy as np
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
QUALIIFY_ROUND = 'Vorrunde'
DIFF = '+/-'

QUALIFY_TABLE_HEADERS = {
    STANDING: 'Gruppe',
    TEAM: 'Team',
    POINTS: 'Punkte',
    PF: 'PF',
    PA: 'PA',
    DIFF: '+/-'
}

SCHEDULE_TABLE_HEADERS = {
    SCHEDULED: 'Kick-Off',
    FIELD: 'Feld',
    OFFICIALS: 'Officials',
    STAGE: 'Runde',
    STANDING: 'Platz',
    HOME: 'Heim',
    POINTS_HOME: 'Punkte Heim',
    POINTS_AWAY: 'Punkte Gast',
    AWAY: 'Gast',
    STATUS: 'Status'
}


class GamedayModelWrapper:

    def __init__(self, pk):
        self._gameinfo: DataFrame = pd.DataFrame(Gameinfo.objects.filter(gameday_id=pk).values())
        if self._gameinfo.empty:
            raise Gameinfo.DoesNotExist

        gameresult = pd.DataFrame(Gameresult.objects.filter(gameinfo_id__in=self._gameinfo['id'].to_numpy()).values())
        games_with_result = pd.merge(self._gameinfo, gameresult, left_on='id', right_on='gameinfo_id')
        if len(games_with_result[games_with_result[FH].notnull()]) == 0:
            games_with_result[PF] = ''
            games_with_result[DIFF] = ''
            games_with_result[POINTS] = ''
            games_with_result = games_with_result.fillna('')
            self._games_with_result: DataFrame = games_with_result
            return
        games_with_result.astype({FH: 'int32', SH: 'int32', PA: 'int32'})
        games_with_result[PF] = games_with_result.fh + games_with_result.sh
        games_with_result[DIFF] = games_with_result[PF] - games_with_result[PA]
        games_with_result[POINTS] = np.where(games_with_result[PF] == games_with_result[PA], 1,
                                             np.where(games_with_result[PF] > games_with_result[PA], 3, 0))
        self._games_with_result: DataFrame = games_with_result

    def has_finalround(self):
        return QUALIIFY_ROUND in self._gameinfo[STAGE].values

    def get_schedule(self):
        home_teams = self._games_with_result.groupby('gameinfo_id').nth(0).reset_index()
        away_teams = self._games_with_result.groupby('gameinfo_id').nth(1).reset_index()
        home_teams = home_teams.rename(columns={TEAM: HOME, PF: POINTS_HOME})
        away_teams = away_teams.rename(columns={TEAM: AWAY, PF: POINTS_AWAY})
        away_teams = away_teams[[POINTS_AWAY, AWAY]]
        qualify_round = pd.concat([home_teams, away_teams], axis=1).sort_values(by=[FIELD, SCHEDULED])
        qualify_round = qualify_round[['gameinfo_id', HOME, POINTS_HOME, POINTS_AWAY, AWAY]]

        schedule = self._gameinfo.merge(qualify_round, how='left', right_on='gameinfo_id', left_on='id')
        schedule = schedule.sort_values(by=[FIELD, SCHEDULED])
        schedule = schedule.sort_values(by=STAGE, ascending=False)
        schedule = schedule[
            [SCHEDULED, FIELD, OFFICIALS, STAGE, STANDING, HOME, POINTS_HOME, POINTS_AWAY, AWAY, STATUS]]
        schedule.fillna('', inplace=True)
        schedule = schedule.rename(columns=SCHEDULE_TABLE_HEADERS)
        return schedule

    def get_qualify_table(self):
        if not self.has_finalround():
            return ''
        qualify_gameinfo_ids = self._gameinfo[self._gameinfo[STAGE] == QUALIIFY_ROUND].id.values
        qualify_mask = self._games_with_result['gameinfo_id'].isin(qualify_gameinfo_ids)
        qualify_round = self._games_with_result[qualify_mask]
        qualify_round = qualify_round.groupby([STANDING, TEAM], as_index=False)
        qualify_round = qualify_round.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        qualify_round = qualify_round.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        qualify_round = qualify_round.sort_values(by=STANDING)
        qualify_round = qualify_round[[STANDING, TEAM, POINTS, PF, PA, DIFF]]
        qualify_round = qualify_round.rename(columns=QUALIFY_TABLE_HEADERS)
        return qualify_round

    def get_final_table(self):
        return ''
