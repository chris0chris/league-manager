import json
from datetime import datetime

import numpy as np
import pandas as pd
from gspread_pandas import Spread
from pandas import DataFrame

from gamedays.models import Gameday

HOME = 'Heim'
HOME_SCORE = 'Punkte Heim'
AWAY_SCORE = 'Punkte Gast'
AWAY = 'Gast'
STANDING = 'Platzierungsspiel'
STAGE = 'Runde'
TEAM = 'Team'
DIFF = '+/-'
PA = 'PA'
PF = 'PF'
POINTS = 'Punkte'


def get_gamedays_spreads():
    s = Spread('1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY')
    gamedays = []
    for index, sheet in enumerate(s.sheets):
        gameday = {}
        tmp = sheet.title.split(' - ')
        if len(tmp) < 2:
            continue
        gameday['date'] = tmp[0]
        gameday['name'] = tmp[1]
        gameday['id'] = index
        gamedays.append(gameday)
    return gamedays


def get_final_matchups(qualify_table: DataFrame, schedule: DataFrame):
    if 'Hauptrunde' in schedule[STAGE].values:
        return {}
    playoff_matchups = _get_playoff_teams(qualify_table)
    if playoff_matchups is None:
        return {}
    print(playoff_matchups is None)
    po = schedule[schedule[STANDING] == 'PO'].reset_index()
    playoff_matchups['results'].append([[None, None], [int(po.at[0, HOME_SCORE]), int(po.at[0, AWAY_SCORE])],
                                        [int(po.at[1, HOME_SCORE]), int(po.at[1, AWAY_SCORE])], [None, None]])
    sf = schedule[schedule[STANDING] == 'HF'].reset_index()
    playoff_matchups['results'].append([[int(sf.at[0, HOME_SCORE]), int(sf.at[0, AWAY_SCORE])],
                                        [int(sf.at[1, HOME_SCORE]), int(sf.at[1, AWAY_SCORE])]])
    f = pd.concat([schedule[schedule[STANDING] == 'P1'],
                   schedule[schedule[STANDING] == 'P3']]).reset_index()
    playoff_matchups['results'].append(
        [[int(f.at[0, HOME_SCORE]), int(f.at[0, AWAY_SCORE])], [int(f.at[1, HOME_SCORE]), int(f.at[1, AWAY_SCORE])]])

    return playoff_matchups


def get_gameday(index):
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


def _get_transformed_table(games_with_result):
    home_df = games_with_result[['Heim', 'Punkte Heim', 'Punkte Gast', 'Runde', STANDING]]
    home_df = home_df.rename(columns={'Heim': TEAM, 'Punkte Heim': PF, 'Punkte Gast': PA})
    home_df = home_df[home_df[TEAM] != '']
    away_df = games_with_result[['Gast', 'Punkte Gast', 'Punkte Heim', 'Runde', STANDING]]
    away_df = away_df.rename(columns={'Gast': TEAM, 'Punkte Gast': PF, 'Punkte Heim': PA})
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


def get_spreadsheet(index):
    sheet = Spread('1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY', sheet=index)
    render = {
        'index': False,
        'classes': ['table', 'table-hover'],
        'border': 0,
        'justify': 'left'
    }
    transformed_table = _get_transformed_table(sheet.sheet_to_df(start_row=99))
    qualify_table = _get_qualify_table(transformed_table)
    schedule = _get_schedule(sheet.sheet_to_df(start_row=99))

    return {'schedule': schedule.to_html(**render, table_id='schedule'),
            'qualify_table': qualify_table if qualify_table is None else qualify_table.to_html(**render),
            'final_matchup': None if qualify_table is None else json.dumps(get_final_matchups(qualify_table, schedule)),
            'final_table': _get_final_table(transformed_table, schedule).to_html(**render)
            }


def _get_schedule(schedule: DataFrame):
    schedule = schedule[schedule['Uhrzeit'] != '']
    schedule = schedule[
        ['Uhrzeit', 'Feld', 'Ref-Team', 'Runde', STANDING, 'Heim', 'Punkte Heim', 'Punkte Gast', 'Gast']]
    return schedule


def _get_qualify_table(all_teams_score: DataFrame):
    if all_teams_score[all_teams_score[STAGE] == 'Vorrunde'].empty:
        return None
    all_teams_score = all_teams_score[all_teams_score[STAGE] == 'Vorrunde']
    all_teams_score = all_teams_score.groupby([STANDING, TEAM], as_index=False)
    all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
    all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
    all_teams_score = all_teams_score.sort_values(by=STANDING)
    all_teams_score = all_teams_score[[STANDING, TEAM, POINTS, PF, PA, DIFF]]

    return all_teams_score


def _get_game_outcome(schedule, standing, final_standing):
    schedule = schedule[schedule[STANDING] == standing].reset_index()
    if schedule.at[0, HOME_SCORE] > schedule.at[0, AWAY_SCORE]:
        final_standing.append(schedule.at[0, HOME])
        final_standing.append(schedule.at[0, AWAY])
    else:
        final_standing.append(schedule.at[0, AWAY])
        final_standing.append(schedule.at[0, HOME])

    return final_standing


def _get_game_outcome_by_table(all_teams_score, standing):
    all_teams_score = all_teams_score[all_teams_score[STANDING] == standing]

    all_teams_score = all_teams_score.groupby([TEAM], as_index=False)
    all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
    all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)

    return all_teams_score


def _get_final_table(all_teams_score, schedule):
    final_standing = []
    has_qualify_round = not all_teams_score[all_teams_score[STAGE] == 'Vorrunde'].empty
    if has_qualify_round:
        final_standing = _get_game_outcome(schedule, 'P1', final_standing)
        final_standing = _get_game_outcome(schedule, 'P3', final_standing)
        final_standing = _get_game_outcome(schedule, 'P5', final_standing)
        final_standing += _get_game_outcome_by_table(all_teams_score, 'P7')[TEAM].to_list()
    print(final_standing)
    all_teams_score = all_teams_score.groupby([TEAM], as_index=False)
    all_teams_score = all_teams_score.agg({PF: 'sum', POINTS: 'sum', PA: 'sum', DIFF: 'sum'})
    all_teams_score = all_teams_score.sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
    all_teams_score = all_teams_score[[TEAM, POINTS, PF, PA, DIFF]]
    if has_qualify_round:
        all_teams_score.set_index(TEAM, inplace=True)
        all_teams_score = all_teams_score.reindex(final_standing).reset_index()

    return all_teams_score


def _get_playoff_teams(qualifyTable):
    playoff_matchup = None
    if qualifyTable[TEAM].nunique() == 9:
        print('playoff_matchup')
        p1_table = qualifyTable.groupby(STANDING).nth(0).reset_index()
        p2_table = qualifyTable.groupby(STANDING).nth(1).reset_index()
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
        print('elif')

    return playoff_matchup
