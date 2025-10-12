from datetime import datetime
from typing import Optional

from django.utils import timezone

from gamedays.models import Gameinfo

STATUS_HALFTIME = "2. Halbzeit"
STATUS_FIRST_HALF = "1. Halbzeit"
STATUS_FINISHED = "beendet"


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

    def _save(self, update_fields: Optional[list] = None) -> None:
        self.gameinfo.save(update_fields=update_fields)

    def set_halftime_to_now(self) -> None:
        now = timezone.now()
        self.gameinfo.status = STATUS_HALFTIME
        self.gameinfo.gameHalftime = now
        self._save(update_fields=["status", "gameHalftime"])

    def set_gamestarted_to_now(self) -> None:
        now = timezone.now()
        self.gameinfo.status = STATUS_FIRST_HALF
        self.gameinfo.gameStarted = now
        self._save(update_fields=["status", "gameStarted"])

    def set_game_finished_to_now(self) -> None:
        now = timezone.now()
        self.gameinfo.status = STATUS_FINISHED
        self.gameinfo.gameFinished = now
        self._save(update_fields=["status", "gameFinished"])

    def update_team_in_possession(self, team_name: str) -> None:
        if self.gameinfo.in_possession == team_name:
            return
        self.gameinfo.in_possession = team_name
        self._save(update_fields=["in_possession"])
