import json
from datetime import datetime

from gamedays.service.gameday_settings import SCHEDULED
from gamedays.service.utils import AsJsonEncoder
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper
from teammanager.models import Gameinfo, Gameresult, TeamLog, Gameday


class Tick(object):
    def __init__(self, game_log: TeamLog, is_home):
        self.game_log = game_log
        self.is_home = is_home

    def as_json(self):
        return dict(text=self.get_text(), isHome=self.is_home, time=self.get_time())

    def get_text(self):
        text = self.game_log.event
        if self.game_log.player is not None:
            text = f'{text}: #{self.game_log.player}'
        if self.game_log.player is None and 'Extra' in self.game_log.event:
            text = f'{text}: -'
        if 'Auszeit' in self.game_log.event:
            text = f'{text} - {self.game_log.input}'
        if 'Turnover' == self.game_log.event:
            text = 'Ballabgabe'
        return text

    def __repr__(self):
        return self.as_json()

    def get_time(self):
        return self.game_log.created_time.strftime("%H:%M")


class Liveticker(object):

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
        return self.game.status

    def get_time(self):
        if self.game.gameStarted is None:
            time = self.game.scheduled
        else:
            time = self.game.gameStarted
        return time.strftime("%H:%M")

    def get_ticks(self, number_of_ticks=5):
        ticks = []
        relevant_ticks = TeamLog.objects.filter(gameinfo=self.game).order_by('-created_time')[:number_of_ticks]
        tick: TeamLog
        for tick in relevant_ticks:
            is_home = True if tick.team.name == self.home_name else False
            ticks.append(Tick(tick, is_home).as_json())
        return ticks

    def __repr__(self):
        self.as_json()


class LivetickerService(object):
    def __init__(self, gameday_id=None):
        if gameday_id is None:
            # today_gamedays = Gameday.objects.filter(date=datetime.today())
            # ToDo deleteMe when live
            today_gamedays = Gameday.objects.all()
            self.gameday_ids = [gameday.pk for gameday in today_gamedays]
        else:
            self.gameday_ids = [gameday_id]

    def getLiveticker(self):
        next_games = Gameinfo.objects.filter(
            gameday__in=self.gameday_ids, gameFinished__isnull=True).order_by(SCHEDULED)
        previously_finished_games = Gameinfo.objects.filter(
            gameday__in=self.gameday_ids, gameFinished__isnull=False).order_by(f'-{SCHEDULED}')
        liveticker = []
        liveticker = liveticker + self._filter_games(next_games)
        liveticker = liveticker + self._filter_games(previously_finished_games)
        return liveticker

    def _filter_games(self, games):
        liveticker = []
        next_scheduled = None
        for game in games:
            if next_scheduled is None:
                next_scheduled = game.scheduled
            if next_scheduled == game.scheduled:
                liveticker.append(Liveticker(game))
        return liveticker
