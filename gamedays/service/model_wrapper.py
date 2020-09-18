import numpy as np
import pandas as pd
from pandas import DataFrame

from gamedays.models import Gameinfo, Gameresult

TEAM = 'team'
HOME = 'home'
AWAY = 'away'
POINTS = 'points'
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
GROUP1 = 'Gruppe 1'
FINISHED = 'beendet'

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
        games_with_result = games_with_result.convert_dtypes()
        games_with_result = games_with_result.astype({FH: 'object', SH: 'object', PA: 'object'})
        games_with_result[PF] = games_with_result[FH] + games_with_result[SH]
        games_with_result[DIFF] = games_with_result[PF] - games_with_result[PA]
        tmp = games_with_result.fillna(0)
        tmp[POINTS] = np.where(tmp[PF] == tmp[PA], 1,
                               np.where(tmp[PF] > tmp[PA], 3, 0))
        games_with_result[POINTS] = tmp[POINTS]
        self._games_with_result: DataFrame = games_with_result

    def has_finalround(self):
        return QUALIIFY_ROUND in self._gameinfo[STAGE].values

    def get_schedule(self):
        schedule = self._get_schedule()
        schedule = schedule.sort_values(by=[FIELD, SCHEDULED])
        schedule = schedule.sort_values(by=STAGE, ascending=False)
        schedule = schedule[
            [SCHEDULED, FIELD, OFFICIALS, STAGE, STANDING, HOME, POINTS_HOME, POINTS_AWAY, AWAY, STATUS]]
        schedule = schedule.fillna('')
        schedule = schedule.rename(columns=SCHEDULE_TABLE_HEADERS)
        return schedule

    def get_qualify_table(self):
        if not self.has_finalround():
            return ''
        qualify_round = self._get_table()
        qualify_round = qualify_round[[STANDING, TEAM, POINTS, PF, PA, DIFF]]
        qualify_round = qualify_round.rename(columns=QUALIFY_TABLE_HEADERS)
        return qualify_round

    def get_final_table(self):
        if self._gameinfo[self._gameinfo[STATUS] != FINISHED].empty is False:
            return ''
        final_table = self._games_with_result.groupby([TEAM], as_index=False)
        final_table = final_table.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        final_table = final_table.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        final_table = final_table[[TEAM, POINTS, PF, PA, DIFF]]

        if self.has_finalround():
            if self._games_with_result.nunique()[TEAM] == 7:
                standing = ['P1', 'P3']
                qualify_table = self._get_table()
                schedule = self._get_schedule()
                group1 = qualify_table[qualify_table[STANDING] == GROUP1]
                third = group1.iloc[2][TEAM]
                fourth = group1.iloc[3][TEAM]
                third_vs_fourth_group1 = schedule[
                    (schedule[HOME] == third) & (schedule[AWAY] == fourth)]
                if third_vs_fourth_group1.empty is True:
                    third_vs_fourth_group1 = schedule[
                        (schedule[AWAY] == third) & (schedule[HOME] == fourth)]
                p5 = schedule[schedule[STANDING] == 'P5']
                games_for_fith_place = pd.concat([third_vs_fourth_group1, p5])
                table_fith_place = self._games_with_result[
                    self._games_with_result['gameinfo_id'].isin(games_for_fith_place['gameinfo_id'].values)]
                table_fith_place = table_fith_place.groupby([TEAM], as_index=False)
                table_fith_place = table_fith_place.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
                table_fith_place = table_fith_place.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
                final_standing = self._get_standing_list(standing) + table_fith_place[TEAM].to_list()
            else:
                standing = ['P1', 'P3', 'P5', 'P7']
                final_standing = self._get_standing_list(standing)
            final_table.set_index(TEAM, inplace=True)
            final_table = final_table.reindex(final_standing).reset_index()

        return final_table

    def _get_standing_list(self, standing):
        final_standing = self._games_with_result[self._games_with_result[STANDING].isin(standing)]
        final_standing = final_standing.sort_values(by=POINTS, ascending=False)
        final_standing = final_standing.sort_values(by=[STANDING])
        final_standing = final_standing[TEAM].to_list()
        return final_standing

    def _get_schedule(self):
        home_teams = self._games_with_result.groupby('gameinfo_id').nth(0).reset_index()
        away_teams = self._games_with_result.groupby('gameinfo_id').nth(1).reset_index()
        home_teams = home_teams.rename(columns={TEAM: HOME, PF: POINTS_HOME})
        away_teams = away_teams.rename(columns={TEAM: AWAY, PF: POINTS_AWAY})
        away_teams = away_teams[[POINTS_AWAY, AWAY]]
        qualify_round = pd.concat([home_teams, away_teams], axis=1).sort_values(by=[FIELD, SCHEDULED])
        qualify_round = qualify_round[['gameinfo_id', HOME, POINTS_HOME, POINTS_AWAY, AWAY]]

        schedule = self._gameinfo.merge(qualify_round, how='left', right_on='gameinfo_id', left_on='id')
        return schedule

    def _get_table(self):
        qualify_round = self._games_with_result[self._games_with_result[STAGE] == QUALIIFY_ROUND]
        qualify_round = qualify_round.groupby([STANDING, TEAM], as_index=False)
        qualify_round = qualify_round.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        qualify_round = qualify_round.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        qualify_round = qualify_round.sort_values(by=STANDING)
        return qualify_round

    def get_qualify_team_by(self, place, standing):
        qualify_round = self._get_table()
        return qualify_round.groupby(STANDING).nth(place - 1).loc[standing][TEAM]

    def get_team_by_points(self, place, standing, points):
        return self._games_with_result[
            (self._games_with_result[STANDING] == standing) & (self._games_with_result[POINTS] == points)].iloc[
            place - 1][TEAM]

    def get_team_by(self, place, standing, points=None):
        if points is None:
            return self.get_qualify_team_by(place, standing)
        return self.get_team_by_points(place, standing, points)

    def is_finished(self, check):
        if self._gameinfo[self._gameinfo[STAGE].isin([check])].empty:
            return len(self._gameinfo[(self._gameinfo[STANDING] == check) & (self._gameinfo[STATUS] == FINISHED)]) \
                   == len(self._gameinfo[(self._gameinfo[STANDING] == check)])

        return len(self._gameinfo[(self._gameinfo[STAGE] == check) & (self._gameinfo[STATUS] == FINISHED)]) \
               == len(self._gameinfo[(self._gameinfo[STAGE] == check)])
