import json
import pathlib
from abc import ABC, abstractmethod

from gamedays.models import Gameinfo, Gameresult
from gamedays.service.model_wrapper import GamedayModelWrapper


class Abstract(ABC):
    @abstractmethod
    def update_schedule(self):
        pass


class UpdateGameEntry:
    STANDING = 'standing'
    PLACE = 'place'
    POINTS = 'points'

    def __init__(self, entry):
        self.entry = entry

    def get_standing(self, home_away):
        return self.entry[home_away][self.STANDING]

    def get_place(self, home_away):
        return self.entry[home_away][self.PLACE]

    def get_points(self, home_away):
        if self.POINTS in self.entry[home_away]:
            return self.entry[home_away][self.POINTS]
        return None


class UpdateEntry:
    def __init__(self, entry):
        self.entry = entry
        self.current = -1

    def get_name(self):
        return self.entry['name']

    def _get_games(self):
        return self.entry['games']

    def __iter__(self):
        for game in self.entry['games']:
            yield UpdateGameEntry(game)

    def __next__(self):
        self.current = + 1
        if self.current < len(self._get_games()):
            return self.current
        raise StopIteration


class ScheduleUpdate:
    def __init__(self, gameday_id):
        self.gameday_id = gameday_id
        self.schedule_version = '6_2'
        with open(pathlib.Path(__file__).parent / 'schedules/update_{0}.json'.format(self.schedule_version), 'r') as f:
            self.data = json.loads(f.read())
        # 6er Spieltag
        # 2 Felder

    def _create_gameresult(self, gi, team, is_home):
        gameresult = Gameresult()
        gameresult.team = team
        gameresult.isHome = is_home
        gameresult.gameinfo = gi
        gameresult.save()

    def update(self):
        gmw = GamedayModelWrapper(self.gameday_id)
        for s in self.data:
            if gmw.is_finished(s['pre-finished']) and not gmw.is_finished(s['name']):
                entry = UpdateEntry(s)
                qs = Gameinfo.objects.filter(gameday_id=self.gameday_id, standing=entry.get_name())
                for gi, game in zip(qs, entry):

                    home = gmw.get_team_by(game.get_place('home'), game.get_standing('home'), game.get_points('home'))
                    self._create_gameresult(gi, home, True)
                    away = gmw.get_team_by(game.get_place('away'), game.get_standing('away'), game.get_points('away'))
                    self._create_gameresult(gi, away, False)
                    try:
                        gi.officials = gmw.get_team_by(game.get_place('officials'), game.get_standing('officials'),
                                                       game.get_points('officials'))
                        gi.save()
                    except IndexError:

                        pass
