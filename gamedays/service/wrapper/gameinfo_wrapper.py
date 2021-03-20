from datetime import datetime

from teammanager.models import Gameinfo


class GameinfoWrapper(object):
    def __init__(self, game_id):
        self.gameinfo = Gameinfo.objects.get(id=game_id)

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
