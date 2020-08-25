import numpy as np
import pandas as pd

from gamedays.models import Gameday, Gameinfo, Gameresult
from gamedays.service.model_wrapper import GamedayModelWrapper


class EmptySchedule:
    @staticmethod
    def to_html():
        return 'Spielplan wurde noch nicht erstellt'


class GamedayService:

    def __init__(self):
        pass

    def get_schedule(self):
        return EmptySchedule.to_html()

    def get_game_schedule_and_table(self, pk):
        gameday = pd.DataFrame(Gameday.objects.filter(pk=pk).values())
        gameInfo = pd.DataFrame(Gameinfo.objects.filter(gameday_id=gameday.id).values())
        if gameInfo.empty is True:
            return {'schedule': None, 'final_table': None}
        gameResult = pd.DataFrame(Gameresult.objects.filter(id__in=gameInfo['id'].to_numpy()).values())
        allGames = pd.merge(gameday, gameInfo, left_on='id', right_on='gameday_id')
        gamesWithResult = pd.merge(allGames, gameResult, left_on='id_y', right_on='gameinfo_id')
        gamesWithResult['pf'] = gamesWithResult.fh + gamesWithResult.sh

        schedule = _get_game_schedule(allGames, gamesWithResult)
        gamedayTable = _get_qualify_table(gamesWithResult)
        gmw = GamedayModelWrapper(pk)

        return {'schedule': gmw.get_schedule().to_html(), 'final_table': gamedayTable.to_html()}

    def _get_game_schedule(self, allGames, gamesWithResult):
        gamelist1 = gamesWithResult.groupby('gameinfo_id').nth(0).reset_index()
        gamelist2 = gamesWithResult.groupby('gameinfo_id').nth(1).reset_index()
        gamelist1 = gamelist1.rename(columns={'team': 'Heim', 'pf': 'Punkte'})
        gamelist2 = gamelist2.rename(columns={'team': 'Gast', 'pf': 'Punkte'})
        gamelist2 = gamelist2[['Punkte', 'Gast']]
        prelim = pd.concat([gamelist1, gamelist2], axis=1).sort_values(by=['field', 'scheduled'])

        schedule = allGames.merge(prelim, how='left')
        schedule = schedule.sort_values(by=['field', 'scheduled'])
        schedule = schedule.sort_values(by='stage', ascending=False)
        schedule = schedule[
            ['scheduled', 'field', 'officials', 'stage', 'standing', 'Heim', 'Punkte', 'Gast', 'status']]
        schedule.fillna('', inplace=True)

        return schedule

    def _get_qualify_table(self, gamesWithResult):
        gamesWithResult['points'] = np.where(gamesWithResult.pf == gamesWithResult.pa, 1,
                                             np.where(gamesWithResult.pf > gamesWithResult.pa, 3, 0))
        gamesWithResult['diff'] = gamesWithResult.pf - gamesWithResult.pa

        gamesWithResult = gamesWithResult[gamesWithResult['stage'] == 'Vorrunde']
        gamesWithResult = gamesWithResult.groupby(['standing', 'team'], as_index=False)
        gamesWithResult = gamesWithResult.agg({'pf': 'sum', 'points': 'sum', 'pa': 'sum', 'diff': 'sum'})
        gamesWithResult = gamesWithResult.sort_values(by=['points', 'diff', 'pf', 'pa'], ascending=False)
        gamesWithResult = gamesWithResult.sort_values(by='standing')

        return gamesWithResult


def get_game_schedule_and_table(pk):
    gameday = pd.DataFrame(Gameday.objects.filter(pk=pk).values())
    gameInfo = pd.DataFrame(Gameinfo.objects.filter(gameday_id=gameday.id).values())
    gameResult = pd.DataFrame(Gameresult.objects.all().values())
    if gameInfo.empty is True:
        return {'schedule': None, 'final_table': None}
    allGames = pd.merge(gameday, gameInfo, left_on='id', right_on='gameday_id')
    gamesWithResult = pd.merge(allGames, gameResult, left_on='id_y', right_on='gameinfo_id')
    gamesWithResult['pf'] = gamesWithResult.fh + gamesWithResult.sh

    schedule = _get_game_schedule(allGames, gamesWithResult)
    gamedayTable = _get_qualify_table(gamesWithResult)

    return {'schedule': schedule.to_html(), 'final_table': gamedayTable.to_html()}


def _get_game_schedule(allGames, gamesWithResult):
    gamelist1 = gamesWithResult.groupby('gameinfo_id').nth(0).reset_index()
    gamelist2 = gamesWithResult.groupby('gameinfo_id').nth(1).reset_index()
    gamelist1 = gamelist1.rename(columns={'team': 'Heim', 'pf': 'Punkte'})
    gamelist2 = gamelist2.rename(columns={'team': 'Gast', 'pf': 'Punkte'})
    gamelist2 = gamelist2[['Punkte', 'Gast']]
    prelim = pd.concat([gamelist1, gamelist2], axis=1).sort_values(by=['field', 'scheduled'])

    schedule = allGames.merge(prelim, how='left')
    schedule = schedule.sort_values(by=['field', 'scheduled'])
    schedule = schedule.sort_values(by='stage', ascending=False)
    schedule = schedule[['scheduled', 'field', 'officials', 'stage', 'standing', 'Heim', 'Punkte', 'Gast', 'status']]
    schedule.fillna('', inplace=True)

    return schedule


def _get_qualify_table(gamesWithResult):
    gamesWithResult['points'] = np.where(gamesWithResult.pf == gamesWithResult.pa, 1,
                                         np.where(gamesWithResult.pf > gamesWithResult.pa, 3, 0))
    gamesWithResult['diff'] = gamesWithResult.pf - gamesWithResult.pa

    gamesWithResult = gamesWithResult[gamesWithResult['stage'] == 'Vorrunde']
    gamesWithResult = gamesWithResult.groupby(['standing', 'team'], as_index=False)
    gamesWithResult = gamesWithResult.agg({'pf': 'sum', 'points': 'sum', 'pa': 'sum', 'diff': 'sum'})
    gamesWithResult = gamesWithResult.sort_values(by=['points', 'diff', 'pf', 'pa'], ascending=False)
    gamesWithResult = gamesWithResult.sort_values(by='standing')

    return gamesWithResult
