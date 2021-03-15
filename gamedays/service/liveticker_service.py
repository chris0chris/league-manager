import json
from datetime import datetime

from gamedays.service.utils import AsJsonEncoder
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper
from teammanager.models import Gameinfo, Gameresult, TeamLog, Gameday


class Tick(object):
    def __init__(self, game_log: TeamLog, is_home):
        self.game_log = game_log
        self.is_home = is_home

    def as_json(self):
        return dict(text=self.get_text(), isHome=self.is_home, time=None)

    def get_text(self):
        text = self.game_log.event
        if self.game_log.player is not None:
            text = f'{text}: #{self.game_log.player}'
        return text

    def __repr__(self):
        return self.as_json()


class Liveticker(object):
    SCHEDULED = 'Geplant'

    def __init__(self, game):
        self.game: Gameinfo = game
        self.gameresult_wrapper = GameresultWrapper(game)
        self.home_name = self.gameresult_wrapper.get_home_name()
        self.away_name = self.gameresult_wrapper.get_away_name()

    def as_json(self):
        return dict(
            status=self.get_status(),
            time=self.get_time(),
            home={
                "name": self.home_name,
                "score": self.gameresult_wrapper.get_home_score(),
            },
            away={
                "name": self.away_name,
                "score": self.gameresult_wrapper.get_away_score(),
            },
            ticks=self.get_ticks())

    def get_status(self):
        if self.game.gameStarted is None:
            return self.SCHEDULED
        return self.game.status

    def get_time(self):
        if self.game.gameStarted is None:
            time = self.game.scheduled
        else:
            time = self.game.gameStarted
        return time.strftime("%H:%M")

    def get_ticks(self):
        ticks = []
        game_log_entry: TeamLog
        for game_log_entry in TeamLog.objects.filter(gameinfo=self.game):
            is_home = True if game_log_entry.team.name == self.home_name else False
            ticks.append(Tick(game_log_entry, is_home).as_json())
        return ticks

    def __repr__(self):
        self.as_json()



class LivetickerService(object):
    def __init__(self, gameday_id=None):
        if gameday_id is None:
            today_gamedays = Gameday.objects.filter(date=datetime.today())
            self.gameday_ids = [gameday.pk for gameday in today_gamedays]
        else:
            self.gameday_ids = [gameday_id]

    def getLiveticker(self):
        games = Gameinfo.objects.filter(gameday__in=self.gameday_ids, gameFinished__isnull=True).order_by('scheduled')
        liveticker = []
        next_scheduled = None
        for game in games:
            if next_scheduled is None:
                next_scheduled = game.scheduled
            if next_scheduled == game.scheduled:
                liveticker.append(Liveticker(game))
        return liveticker