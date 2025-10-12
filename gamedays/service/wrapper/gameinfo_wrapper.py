from datetime import datetime

from gamedays.models import Gameinfo


class GameinfoWrapper(object):
    def __init__(self, gameinfo):
        self.gameinfo = gameinfo

    @classmethod
    def from_id(cls, game_id: int) -> "GameinfoWrapper":
        gi = Gameinfo.objects.get(pk=game_id)
        return cls(gi)

    @classmethod
    def from_instance(cls, gameinfo: Gameinfo) -> "GameinfoWrapper":
        return cls(gameinfo)

    def set_halftime_to_now(self):
        self.gameinfo.status = '2. Halbzeit'
        self.gameinfo.gameHalftime = datetime.now()
        self.gameinfo.save()

    def set_gamestarted_to_now(self):
        self.gameinfo.status = '1. Halbzeit'
        self.gameinfo.gameStarted = datetime.now()
        self.gameinfo.save()

    def set_game_finished_to_now(self):
        self.gameinfo.status = 'beendet'
        self.gameinfo.gameFinished = datetime.now()
        self.gameinfo.save()

    def update_team_in_possession(self, team_name):
        self.gameinfo.in_possession = team_name
        self.gameinfo.save()
