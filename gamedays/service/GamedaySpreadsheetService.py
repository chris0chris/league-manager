import numpy as np
import pandas as pd
from gspread_pandas import Spread
from pandas import DataFrame


def get_gamedays_spreads():
    s = Spread('1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY')
    gamedays = []
    for index, sheet in enumerate(s.sheets):
        gameday = {}
        tmp = sheet.title.split(' - ')
        if len(tmp) < 2:
            print(tmp)
            continue
        gameday['date'] = tmp[0]
        gameday['name'] = tmp[1]
        gameday['id'] = index
        gamedays.append(gameday)
    return gamedays


def get_spreadsheet(index):
    sheet = Spread('1aDTA6HVfE6j6TDJn2D3e_zDYs4HO0UVJJSt3BXptuyY', sheet=index)
    render = {
        'index': False,
        'classes': ['table', 'table-hover'],
        'border': 0,
        'justify': 'left'
    }
    gspread = {'schedule': _get_schedule(sheet).to_html(**render),
               'table': _get_qualify_table(sheet).to_html(**render)
               }
    return gspread


def _get_schedule(s):
    schedule: DataFrame = s.sheet_to_df(start_row=99)
    schedule = schedule[
        ['Uhrzeit', 'Feld', 'Ref-Team', 'Runde', 'Platzierungsspiel', 'Heim', 'Punkte Heim', 'Punkte Gast', 'Gast']]
    schedule = schedule[schedule['Uhrzeit'] != '']
    return schedule


def _get_qualify_table(sheet):
    gamesWithResult: DataFrame = sheet.sheet_to_df(start_row=99)
    # gamesWithResult = gamesWithResult[ gamesWithResult['Runde'] == 'Vorrunde']
    homeDF = gamesWithResult[['Heim', 'Punkte Heim', 'Punkte Gast', 'Runde', 'Platzierungsspiel']]
    homeDF = homeDF.rename(columns={'Heim': 'team', 'Punkte Heim': 'pf', 'Punkte Gast': 'pa'})
    awayDF = gamesWithResult[['Gast', 'Punkte Gast', 'Punkte Heim', 'Runde', 'Platzierungsspiel']]
    awayDF = awayDF.rename(columns={'Gast': 'team', 'Punkte Gast': 'pf', 'Punkte Heim': 'pa'})
    allTeamsScore = pd.concat([homeDF, awayDF])
    print(allTeamsScore)
    # allTeamsScore = allTeamsScore.replace('', 0)
    print(allTeamsScore[['team', 'pa', 'pf']])
    allTeamsScore['pf'] = pd.to_numeric(allTeamsScore['pf'], errors='coerce')
    allTeamsScore['pa'] = pd.to_numeric(allTeamsScore['pa'], errors='coerce')
    allTeamsScore = allTeamsScore.fillna(0)
    allTeamsScore = allTeamsScore.astype({'pa': 'int32', 'pf': 'int32'})
    print(allTeamsScore.dtypes)
    print(allTeamsScore[['team', 'pa', 'pf', 'Runde']])
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
