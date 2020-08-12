import numpy as np
import pandas as pd
from gspread_pandas import Spread
from pandas import DataFrame

SPREAD_ID = '1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY'

HOME = 'Heim'
HOME_SCORE = 'Punkte Heim'
AWAY_SCORE = 'Punkte Gast'
AWAY = 'Gast'
STANDING = 'Platz'
STAGE = 'Runde'
TEAM = 'Team'
DIFF = '+/-'
PA = 'PA'
PF = 'PF'
POINTS = 'Punkte'
SF = 'HF'
PO = 'PO'
MAIN_ROUND = 'Hauptrunde'
QUALIFY_ROUND = 'Vorrunde'
SCHEDULED_TIME = 'Zeit'
FIELD = 'Feld'
OFFICIALS = 'Officials'


class SpreadsheetWrapper:
    spreadsheet = None
    schedule: DataFrame = None

    def __init__(self, index=None):
        if (index is None):
            self.spreadsheet = Spread(SPREAD_ID)
        else:
            self.spreadsheet = Spread(SPREAD_ID, index)
            self.schedule = self.spreadsheet.sheet_to_df(start_row=99)
            self.schedule = self.schedule[self.schedule[SCHEDULED_TIME] != '']

    def get_sheets(self):
        sheets = []
        for index, sheet in enumerate(self.spreadsheet.sheets):
            tmp = sheet.title.split(' - ')
            if len(tmp) < 2:
                continue
            sheet_info = {
                'date': tmp[0],
                'name': tmp[1],
                'id': index
            }
            sheets.append(sheet_info)
        return sheets

    def has_finalround(self):
        if QUALIFY_ROUND in self.schedule[STAGE].values:
            return True
        return False

    def has_playoff_round(self):
        return self.schedule[self.schedule[STANDING] == PO].empty is False

    def is_qualify_finished(self):
        return self.schedule[(self.schedule[AWAY_SCORE] == '') & (self.schedule[STAGE] == QUALIFY_ROUND)].empty

    def get_qualify_table(self):
        if not self.has_finalround():
            return None
        all_qualify_teams_score = self._prepare_schedule_to_table(self.schedule, stage=[QUALIFY_ROUND])
        all_qualify_teams_score = all_qualify_teams_score.groupby([STANDING, TEAM], as_index=False)
        all_qualify_teams_score = all_qualify_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        all_qualify_teams_score = all_qualify_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        all_qualify_teams_score = all_qualify_teams_score.sort_values(by=STANDING)
        all_qualify_teams_score = all_qualify_teams_score[[STANDING, TEAM, POINTS, PF, PA, DIFF]]
        return all_qualify_teams_score

    def get_table_for(self, standing=None):
        all_teams_score = self._prepare_schedule_to_table(self.schedule, standing=standing)
        if standing is not None:
            all_teams_score = all_teams_score.groupby([STANDING, TEAM], as_index=False)
        else:
            all_teams_score = all_teams_score.groupby([TEAM], as_index=False)
        all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        if standing is not None:
            all_teams_score = all_teams_score.sort_values(by=STANDING)
        all_teams_score = all_teams_score[[TEAM, POINTS, PF, PA, DIFF]]
        return all_teams_score

    def _prepare_schedule_to_table(self, schedule, stage=None, standing=None):
        if stage is not None:
            schedule = schedule[schedule[STAGE].isin(stage)]
        elif standing is not None:
            schedule = schedule[schedule[STANDING].isin(standing)]
        home_df = schedule[[HOME, HOME_SCORE, AWAY_SCORE, STAGE, STANDING]]
        home_df = home_df.rename(columns={HOME: TEAM, HOME_SCORE: PF, AWAY_SCORE: PA})
        home_df = home_df[home_df[TEAM] != '']
        away_df = schedule[[AWAY, AWAY_SCORE, HOME_SCORE, STAGE, STANDING]]
        away_df = away_df.rename(columns={AWAY: TEAM, AWAY_SCORE: PF, HOME_SCORE: PA})
        away_df = away_df[away_df[TEAM] != '']
        all_teams_score = pd.concat([home_df, away_df])
        all_teams_score[PF] = pd.to_numeric(all_teams_score[PF], errors='coerce')
        all_teams_score[PA] = pd.to_numeric(all_teams_score[PA], errors='coerce')
        all_teams_score = all_teams_score.fillna(0)
        all_teams_score = all_teams_score.astype({PA: 'int32', PF: 'int32'})
        all_teams_score[DIFF] = all_teams_score[PF] - all_teams_score[PA]
        all_teams_score[POINTS] = np.where(all_teams_score.PF == all_teams_score.PA, 1,
                                           np.where(all_teams_score.PF > all_teams_score.PA, 3, 0))
        return all_teams_score

    def get_game_result(self, standing):
        result_df = self.schedule[self.schedule[STANDING] == standing]
        if result_df.empty is True:
            return None
        game_result = []
        for index, row in result_df.iterrows():
            game_result.append({
                "home": {
                    "score": int(row[HOME_SCORE]),
                    "team": row[HOME]
                },
                "away": {
                    "score": int(row[AWAY_SCORE]),
                    "team": row[AWAY]
                },
            })
        return game_result

    def are_games_finished(self):
        return self.schedule[self.schedule[AWAY_SCORE] == ''].empty is True

    def get_schedule(self):
        self.schedule = self.schedule[
            [SCHEDULED_TIME, FIELD, OFFICIALS, STAGE, STANDING, HOME, HOME_SCORE, AWAY_SCORE, AWAY]]
        return self.schedule

    def get_table_for_7_teams(self):
        qualify_table = self.get_qualify_table()
        group1 = qualify_table[qualify_table[STANDING] == 'Gruppe 1']
        third_place = group1.iloc[2][TEAM]
        fourth_place = group1.iloc[3][TEAM]
        third_vs_fourth = self.schedule[(self.schedule[HOME] == third_place) & (self.schedule[AWAY] == fourth_place)]
        if third_vs_fourth.empty is True:
            third_vs_fourth = self.schedule[
                (self.schedule[AWAY] == third_place) & (self.schedule[HOME] == fourth_place)]
        p5 = self.schedule[self.schedule[STANDING] == 'P5']
        fith_place = pd.concat([self.schedule[self.schedule[STANDING] == 'P5'], third_vs_fourth])
        all_teams_score = self._prepare_schedule_to_table(fith_place)
        all_teams_score = all_teams_score.groupby([TEAM], as_index=False)
        all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        return all_teams_score
