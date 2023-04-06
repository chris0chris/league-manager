from datetime import datetime

from gamedays.models import League, Gameday, Gameinfo, TeamLog
from gamedays.service.gameday_settings import SCHEDULED, GAMEDAY_ID
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper


class Tick(object):
    def __init__(self, game_log: TeamLog, team):
        self.game_log = game_log
        self.team = team

    def as_json(self):
        return dict(text=self.get_text(), team=self.team, time=self.get_time())

    def get_text(self):
        text = self.game_log.event
        if self.game_log.player is not None:
            text = f'{text}: #{self.game_log.player}'
        if self.game_log.player is None and 'Extra' in self.game_log.event:
            text = f'{text}: -'
        if self.game_log.event in ['Auszeit', 'Spielzeit', 'Strafe']:
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
        self.number_of_ticks = 5
        self.game: Gameinfo = game
        self.gameresult_wrapper = GameresultWrapper(game)
        self.home_name = self.gameresult_wrapper.get_home_name()
        self.away_name = self.gameresult_wrapper.get_away_name()

    def as_json(self):
        return dict(
            gameId=self.game.pk,
            status=self.get_status(),
            standing=self.game.standing,
            time=self.get_time(),
            home={
                "name": self.gameresult_wrapper.get_home_fullname(),
                "score": self.gameresult_wrapper.get_home_score(),
                "isInPossession": self.is_home_in_possession(),
            },
            away={
                "name": self.gameresult_wrapper.get_away_fullname(),
                "score": self.gameresult_wrapper.get_away_score(),
                "isInPossession": self.is_away_in_possession(),
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

    def get_ticks(self):
        ticks = []
        relevant_ticks = TeamLog.objects.filter(gameinfo=self.game).exclude(isDeleted=True).order_by('-created_time')[
            slice(None, self.number_of_ticks)]
        tick: TeamLog
        for tick in relevant_ticks:
            if tick.team is None or tick.event == 'Spielzeit':
                is_home = None
            else:
                is_home = 'home' if tick.team.name == self.home_name else 'away'
            ticks.append(Tick(tick, is_home).as_json())
        return ticks

    def __repr__(self):
        self.as_json()

    def is_home_in_possession(self):
        return self.game.in_possession == self.home_name

    def is_away_in_possession(self):
        return self.game.in_possession == self.away_name

    def collect_all_ticks(self):
        self.number_of_ticks = None


class LivetickerService(object):
    def __init__(self, gameday_id=None, game_ids_with_all_ticks=(), league=()):
        self.game_ids_with_all_ticks = list(map(int, game_ids_with_all_ticks))
        if not league:
            league = League.objects.all()
        else:
            league = League.objects.filter(name__in=league)
        if gameday_id is None:
            today_gamedays = Gameday.objects.filter(date=datetime.today(), league__in=league)
            # ToDo  dummy Scorecard
            # if settings.DEBUG:
            #     today_gamedays = Gameday.objects.all()
            self.gameday_ids = [gameday.pk for gameday in today_gamedays]
        else:
            self.gameday_ids = [gameday_id]

    def get_liveticker(self):
        next_games = Gameinfo.objects.filter(
            gameday__in=self.gameday_ids, gameFinished__isnull=True).order_by(SCHEDULED, GAMEDAY_ID, 'id')
        previously_finished_games = Gameinfo.objects.filter(
            gameday__in=self.gameday_ids, gameFinished__isnull=False).order_by(f'-{SCHEDULED}')
        liveticker = []
        liveticker = liveticker + self._filter_games(next_games)
        liveticker = liveticker + self._filter_games(previously_finished_games)
        return liveticker

    def _filter_games(self, games):
        all_liveticker = []
        group_by_schedule_time = None
        game: Gameinfo
        for game in games:
            if group_by_schedule_time is None:
                group_by_schedule_time = game.scheduled
            if group_by_schedule_time == game.scheduled or game.status in ['1. Halbzeit', '2. Halbzeit']:
                liveticker = Liveticker(game)
                if game.pk in self.game_ids_with_all_ticks:
                    liveticker.collect_all_ticks()
                all_liveticker.append(liveticker)
        return all_liveticker
