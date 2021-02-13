from datetime import datetime

from gamedays.models import Gameinfo, Gameresult
from gamedays.service.gamelog import GameLog, GameLogCreator


class GameService(object):
    def __init__(self, game_id):
        self.gameinfo: Gameinfo = Gameinfo.objects.get(id=game_id)

    def update_halfetime(self, home_score, away_score):
        self._save_halftime()
        self._save_score(home_score, away_score, True)
        self._save_score(away_score, home_score, False)

    def _save_halftime(self):
        self.gameinfo.status = '2. Halbzeit'
        self.gameinfo.gameHalftime = datetime.now()
        self.gameinfo.save()

    def _save_score(self, score, pa, is_home):
        gameresult: Gameresult = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=is_home)
        gameresult.fh = score
        gameresult.pa = pa
        gameresult.save()

    def get_gamelog(self):
        return GameLog(self.gameinfo)

    def create_gamelog(self, team, event, half):
        gamelog = GameLogCreator(self.gameinfo, team, event, half)
        return gamelog.create()
