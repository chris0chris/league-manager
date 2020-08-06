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
TEAM = 'team'


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
    po = schedule[schedule['Platzierungsspiel'] == 'PO'].reset_index()
    playoff_matchups['results'].append([[None, None], [int(po.at[0, HOME_SCORE]), int(po.at[0, AWAY_SCORE])],
                                        [int(po.at[1, HOME_SCORE]), int(po.at[1, AWAY_SCORE])], [None, None]])
    sf = schedule[schedule['Platzierungsspiel'] == 'HF'].reset_index()
    playoff_matchups['results'].append([[int(sf.at[0, HOME_SCORE]), int(sf.at[0, AWAY_SCORE])],
                                        [int(sf.at[1, HOME_SCORE]), int(sf.at[1, AWAY_SCORE])]])
    f = pd.concat([schedule[schedule['Platzierungsspiel'] == 'P1'],
                   schedule[schedule['Platzierungsspiel'] == 'P3']]).reset_index()
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


def get_spreadsheet(index):
    sheet = Spread('1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY', sheet=index)
    render = {
        'index': False,
        'classes': ['table', 'table-hover'],
        'border': 0,
        'justify': 'left'
    }
    qualify_table = _get_qualify_table(sheet)
    schedule = _get_schedule(sheet)

    return {'schedule': schedule.to_html(**render, table_id='schedule'),
            'table': qualify_table.to_html(**render),
            'final_matchup': json.dumps(get_final_matchups(qualify_table, schedule))
            }


def _get_schedule(s):
    schedule: DataFrame = s.sheet_to_df(start_row=99)
    schedule = schedule[schedule['Uhrzeit'] != '']
    schedule = schedule[
        ['Uhrzeit', 'Feld', 'Ref-Team', 'Runde', 'Platzierungsspiel', 'Heim', 'Punkte Heim', 'Punkte Gast', 'Gast']]
    return schedule


def _get_qualify_table(sheet):
    gamesWithResult: DataFrame = sheet.sheet_to_df(start_row=99)
    homeDF = gamesWithResult[['Heim', 'Punkte Heim', 'Punkte Gast', 'Runde', 'Platzierungsspiel']]
    homeDF = homeDF.rename(columns={'Heim': 'team', 'Punkte Heim': 'pf', 'Punkte Gast': 'pa'})
    awayDF = gamesWithResult[['Gast', 'Punkte Gast', 'Punkte Heim', 'Runde', 'Platzierungsspiel']]
    awayDF = awayDF.rename(columns={'Gast': 'team', 'Punkte Gast': 'pf', 'Punkte Heim': 'pa'})
    allTeamsScore = pd.concat([homeDF, awayDF])
    allTeamsScore['pf'] = pd.to_numeric(allTeamsScore['pf'], errors='coerce')
    allTeamsScore['pa'] = pd.to_numeric(allTeamsScore['pa'], errors='coerce')
    allTeamsScore = allTeamsScore.fillna(0)
    allTeamsScore = allTeamsScore.astype({'pa': 'int32', 'pf': 'int32'})
    allTeamsScore['diff'] = allTeamsScore['pf'] - allTeamsScore['pa']
    allTeamsScore['points'] = np.where(allTeamsScore.pf == allTeamsScore.pa, 1,
                                       np.where(allTeamsScore.pf > allTeamsScore.pa, 3, 0))
    allTeamsScore = allTeamsScore[allTeamsScore['Runde'].isin(['Vorrunde', 'Hauptrunde'])]

    allTeamsScore = allTeamsScore.groupby(['Platzierungsspiel', 'team'], as_index=False)
    allTeamsScore = allTeamsScore.agg({'pf': 'sum', 'points': 'sum', 'pa': 'sum', 'diff': 'sum'})
    allTeamsScore = allTeamsScore.sort_values(by=['points', 'diff', 'pf', 'pa'], ascending=False)
    allTeamsScore = allTeamsScore.sort_values(by='Platzierungsspiel')
    allTeamsScore = allTeamsScore[['Platzierungsspiel', 'team', 'points', 'diff', 'pf', 'pa']]

    return allTeamsScore


def _get_playoff_teams(qualifyTable):
    playoff_matchup = None
    if qualifyTable[TEAM].nunique() == 9:
        print('playoff_matchup')
        p1_table = qualifyTable.groupby('Platzierungsspiel').nth(0).reset_index()
        p2_table = qualifyTable.groupby('Platzierungsspiel').nth(1).reset_index()
        p1_table = p1_table.sort_values(by=['points', 'diff', 'pf', 'pa'], ascending=False)
        p2_table = p2_table.sort_values(by=['points', 'diff', 'pf', 'pa'], ascending=False)
        playoff_matchup = {
            'teams': [
                [{'name': p1_table.at[0, 'team']}, None],
                [{'name': p2_table.at[0, 'team']}, {'name': p2_table.at[1, 'team']}],
                [{'name': p1_table.at[2, 'team']}, {'name': p2_table.at[2, 'team']}],
                [{'name': p1_table.at[1, 'team']}, None]
            ],
            'results': []
        }
    elif 6 <= qualifyTable[TEAM].nunique() < 9:
        print('elif')

    return playoff_matchup
