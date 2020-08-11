from datetime import datetime

from gspread_pandas import Spread
from pandas import DataFrame

from gamedays.models import Gameday
from .SpreadsheetWrapper import SpreadsheetWrapper

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


class GamedaySpreadsheetService:
    spreadsheet: SpreadsheetWrapper = None

    def __init__(self, index=None):
        if (index is None):
            self.spreadsheet = SpreadsheetWrapper()
        else:
            self.spreadsheet = SpreadsheetWrapper(index)

    def get_gamedays_spreads(self):
        return self.spreadsheet.get_sheets()

    def get_final_matchups(self):
        if not self.spreadsheet.has_finalround() or not self.spreadsheet.is_qualify_finished():
            return {}
        playoff_matchups = self._get_playoff_bracket(self.spreadsheet.get_qualify_table())
        if playoff_matchups is None:
            return {}

        if self.spreadsheet.has_playoff_round():
            results = [[None, None]]
            for game_result in self.spreadsheet.get_game_result(PO):
                results.append([game_result['home_score'], game_result['away_score']])
            results.append([None, None])
            playoff_matchups['results'].append(results)
        results = []
        for game_result in self.spreadsheet.get_game_result(SF):
            results.append([game_result['home_score'], game_result['away_score']])
        playoff_matchups['results'].append(results)

        concat_results = []
        results = []
        concat_results += self.spreadsheet.get_game_result('P3') + self.spreadsheet.get_game_result('P1')
        for game_result in concat_results:
            results.append([game_result['home']['score'], game_result['away']['score']])
        playoff_matchups['results'].append(results)

        return playoff_matchups

    def get_gameday(self, index):
        sheet = Spread('1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY', sheet=index)
        gameday_info: DataFrame = sheet.sheet_to_df(start_row=1, header_rows=0)
        gameday = Gameday()
        gameday.name = gameday_info.iloc[0, 0]
        gameday.date = gameday_info.iloc[2, 3]
        gameday.location = gameday_info.iloc[3, 7]
        gameday.host = gameday_info.iloc[2, 7]
        gameday.cap_meeting = datetime.strptime(gameday_info.iloc[3, 2], '%H:%M')
        gameday.start = datetime.strptime(gameday_info.iloc[4, 2], '%H:%M')
        return gameday

    def get_spreadsheet(self):
        render = {
            'index': False,
            'classes': ['table', 'table-hover'],
            'border': 0,
            'justify': 'left'
        }
        qualify_table = self.spreadsheet.get_qualify_table()
        final_table = self._get_final_table()
        return {'schedule': self.spreadsheet.get_schedule().to_html(**render, table_id='schedule'),
                'qualify_table': qualify_table if qualify_table is None else qualify_table.to_html(**render),
                'final_matchup': None,  # if qualify_table is None else json.dumps(
                #     self.get_final_matchups),
                'final_table': final_table if final_table is None else final_table.to_html(**render)
                }

    def _get_game_outcome(self, game_result):
        if game_result['home']['score'] > game_result['away']['score']:
            return [game_result['home']['team'], game_result['away']['team']]
        else:
            return [game_result['away']['team'], game_result['home']['team']]

    def _get_game_outcome_by_table(self, all_teams_score, standing):
        all_teams_score = all_teams_score[all_teams_score[STANDING] == standing]

        all_teams_score = all_teams_score.groupby([TEAM], as_index=False)
        all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)

        return all_teams_score

    def _get_final_table(self):
        if not self.spreadsheet.are_games_finished():
            return None
        final_standing = []
        all_teams_score = self.spreadsheet._prepare_schedule_to_table()
        if self.spreadsheet.has_finalround():
            final_standing += self._get_game_outcome(self.spreadsheet.get_game_result('P1')[0])
            final_standing += self._get_game_outcome(self.spreadsheet.get_game_result('P3')[0])
            final_standing += self._get_game_outcome(self.spreadsheet.get_game_result('P5')[0])
            final_standing += self._get_game_outcome_by_table(all_teams_score, 'P7')[TEAM].to_list()
        print(final_standing)
        all_teams_score = all_teams_score.groupby([TEAM], as_index=False)
        all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
        all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
        all_teams_score = all_teams_score[[TEAM, POINTS, PF, PA, DIFF]]
        if self.spreadsheet.has_finalround():
            all_teams_score.set_index(TEAM, inplace=True)
            all_teams_score = all_teams_score.reindex(final_standing).reset_index()

        return all_teams_score

    def _get_playoff_bracket(self, qualifyTable):
        playoff_matchup = None
        p1_table = qualifyTable.groupby(STANDING).nth(0).reset_index()
        p2_table = qualifyTable.groupby(STANDING).nth(1).reset_index()
        if qualifyTable[TEAM].nunique() == 9:
            print('playoff_matchup')
            p1_table = p1_table.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
            p2_table = p2_table.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
            playoff_matchup = {
                'teams': [
                    [{'name': p1_table.at[0, TEAM]}, None],
                    [{'name': p2_table.at[0, TEAM]}, {'name': p2_table.at[1, TEAM]}],
                    [{'name': p1_table.at[2, TEAM]}, {'name': p2_table.at[2, TEAM]}],
                    [{'name': p1_table.at[1, TEAM]}, None]
                ],
                'results': []
            }
        elif 6 <= qualifyTable[TEAM].nunique() < 9:
            playoff_matchup = {
                'teams': [
                    [{'name': p2_table.at[0, TEAM]}, {'name': p1_table.at[1, TEAM]}],
                    [{'name': p2_table.at[1, TEAM]}, {'name': p1_table.at[0, TEAM]}]
                ],
                'results': []
            }
            print('elif')

        return playoff_matchup
