import numpy as np
import pandas as pd
from pandas import DataFrame

from gamedays.service.gameday_settings import STANDING, TEAM_NAME, POINTS, POINTS_HOME, POINTS_AWAY, PA, PF, GROUP1, \
    GAMEINFO_ID, DIFF, SCHEDULED, FIELD, OFFICIALS_NAME, STAGE, HOME, AWAY, ID_AWAY, ID_HOME, ID_Y, QUALIIFY_ROUND, \
    STATUS, SH, FH, FINISHED, GAME_FINISHED, DFFL, DIVISION_NAME
from teammanager.models import Gameinfo, Gameresult


class DfflPoints(object):

    @classmethod
    def for_number_teams(cls, number_of_teams):
        dffl_points = [0] * number_of_teams
        if number_of_teams == 3:
            dffl_points = [6, 4, 2]
        if number_of_teams == 4:
            dffl_points = [8, 6, 4, 2]
        if number_of_teams == 5:
            dffl_points = [10, 8, 6, 4, 2]
        if number_of_teams == 6:
            dffl_points = [11, 9, 7, 5, 3, 2]
        if number_of_teams == 7:
            dffl_points = [12, 10, 8, 6, 4, 3, 2]
        if number_of_teams == 8:
            dffl_points = [13, 11, 9, 7, 5, 4, 3, 2]
        if number_of_teams == 9:
            dffl_points = [14, 12, 10, 8, 6, 5, 4, 3, 2]
        return dffl_points


class GamedayModelWrapper:

    def __init__(self, pk):
        self._gameinfo: DataFrame = pd.DataFrame(Gameinfo.objects.filter(gameday_id=pk).values(
            *([f.name for f in Gameinfo._meta.local_fields] + ['officials__name'])))
        if self._gameinfo.empty:
            raise Gameinfo.DoesNotExist

        gameresult = pd.DataFrame(Gameresult.objects.filter(gameinfo_id__in=self._gameinfo['id']).values(
            *([f.name for f in Gameresult._meta.local_fields] + [TEAM_NAME, DIVISION_NAME])))
        games_with_result = pd.merge(self._gameinfo, gameresult, left_on='id', right_on=GAMEINFO_ID)
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
        schedule = schedule.sort_values(by=[SCHEDULED, FIELD])
        return schedule

    def get_qualify_table(self):
        if not self.has_finalround():
            return ''
        qualify_round = self._get_table()
        return qualify_round

    def get_final_table(self):
        if self._gameinfo[self._gameinfo[STATUS] != FINISHED].empty is False:
            return ''
        final_table = self._games_with_result.groupby([TEAM_NAME], as_index=False)
        final_table = final_table.agg({POINTS: 'sum', PF: 'sum', PA: 'sum', DIFF: 'sum', DIVISION_NAME: 'first'})
        final_table = final_table.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)

        if self.has_finalround():
            if self._games_with_result.nunique()[TEAM_NAME] == 7:
                standing = ['P1', 'P3']
                qualify_table = self._get_table()
                schedule = self._get_schedule()
                group1 = qualify_table[qualify_table[STANDING] == GROUP1]
                third = group1.iloc[2][TEAM_NAME]
                fourth = group1.iloc[3][TEAM_NAME]
                third_vs_fourth_group1 = schedule[
                    (schedule[HOME] == third) & (schedule[AWAY] == fourth)]
                if third_vs_fourth_group1.empty is True:
                    third_vs_fourth_group1 = schedule[
                        (schedule[AWAY] == third) & (schedule[HOME] == fourth)]
                p5 = schedule[schedule[STANDING] == 'P5']
                games_for_fith_place = pd.concat([third_vs_fourth_group1, p5])
                table_fith_place = self._games_with_result[
                    self._games_with_result[GAMEINFO_ID].isin(games_for_fith_place[GAMEINFO_ID].values)]
                table_fith_place = table_fith_place.groupby([TEAM_NAME], as_index=False)
                table_fith_place = table_fith_place.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
                table_fith_place = table_fith_place.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
                final_standing = self._get_standing_list(standing) + table_fith_place[TEAM_NAME].to_list()
            else:
                standing = ['P1', 'P3', 'P5', 'P7']
                final_standing = self._get_standing_list(standing)
            final_table.set_index(TEAM_NAME, inplace=True)
            final_table = final_table.reindex(final_standing).reset_index()
        final_table[DFFL] = DfflPoints.for_number_teams(final_table.shape[0])
        return final_table

    def _get_standing_list(self, standing):
        final_standing = self._games_with_result[self._games_with_result[STANDING].isin(standing)]
        final_standing = final_standing.sort_values(by=POINTS, ascending=False)
        final_standing = final_standing.sort_values(by=[STANDING])
        final_standing = final_standing[TEAM_NAME].to_list()
        return final_standing

    def _get_schedule(self):
        home_teams = self._games_with_result.groupby(GAMEINFO_ID).nth(0).reset_index()
        away_teams = self._games_with_result.groupby(GAMEINFO_ID).nth(1).reset_index()
        home_teams = home_teams.rename(columns={TEAM_NAME: HOME, PF: POINTS_HOME, ID_Y: ID_HOME})
        away_teams = away_teams.rename(columns={TEAM_NAME: AWAY, PF: POINTS_AWAY, ID_Y: ID_AWAY})
        away_teams = away_teams[[ID_AWAY, POINTS_AWAY, AWAY]]
        qualify_round = pd.concat([home_teams, away_teams], axis=1).sort_values(by=[FIELD, SCHEDULED])
        qualify_round = qualify_round[[GAMEINFO_ID, ID_HOME, HOME, POINTS_HOME, POINTS_AWAY, AWAY, ID_AWAY]]

        schedule = self._gameinfo.merge(qualify_round, how='left', right_on=GAMEINFO_ID, left_on='id')
        schedule = schedule.astype({ID_HOME: 'object', ID_AWAY: 'object'}).fillna('')
        return schedule

    def _get_table(self):
        qualify_round = self._games_with_result[self._games_with_result[STAGE] == QUALIIFY_ROUND]
        qualify_round = qualify_round.groupby([STANDING, TEAM_NAME], as_index=False)
        qualify_round = qualify_round.agg({POINTS: 'sum', PF: 'sum', PA: 'sum', DIFF: 'sum'})
        qualify_round = qualify_round.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        qualify_round = qualify_round.sort_values(by=STANDING)
        return qualify_round

    def get_qualify_team_by(self, place, standing):
        qualify_round = self._get_table()
        return qualify_round.groupby(STANDING).nth(place - 1).loc[standing][TEAM_NAME]

    def get_team_by_points(self, place, standing, points):
        return self._games_with_result[
            (self._games_with_result[STANDING] == standing) & (self._games_with_result[POINTS] == points)].iloc[
            place - 1][TEAM_NAME]

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

    def get_games_to_whistle(self, team):
        games_to_whistle = self._get_schedule()
        games_to_whistle = games_to_whistle.sort_values(by=[SCHEDULED, FIELD])
        return games_to_whistle[
            (games_to_whistle[OFFICIALS_NAME].str.contains(team)) & (games_to_whistle[GAME_FINISHED] == '')]
