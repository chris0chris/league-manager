from datetime import datetime

from gamedays.models import Gameinfo


class GameinfoWrapper(object):
    def __init__(self, game_id):
        self.gameinfo = Gameinfo.objects.get(id=game_id)

    def set_halfetime_to_now(self):
        self.gameinfo.status = '2. Halbzeit'
        self.gameinfo.gameHalftime = datetime.now()
        self.gameinfo.save()
