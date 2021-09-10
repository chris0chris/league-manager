import json
import pathlib
from abc import ABC, abstractmethod

from gamedays.service.model_wrapper import GamedayModelWrapper
from teammanager.models import Gameinfo, Gameresult, Team


class Abstract(ABC):
    @abstractmethod
    def update_schedule(self):
        pass


class UpdateGameEntry:
    def __init__(self, in_dict: dict):
        assert isinstance(in_dict, dict)
        for key, val in in_dict.items():
            if isinstance(val, (list, tuple)):
                setattr(self, key, [UpdateGameEntry(x) if isinstance(x, dict) else x for x in val])
            else:
                setattr(self, key, UpdateGameEntry(val) if isinstance(val, dict) else val)

    def __getattr__(self, item):
        try:
            return self.__dict__[item]
        except KeyError:
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
    def __init__(self, gameday_id, format):
        self.gameday_id = gameday_id
        with open(pathlib.Path(__file__).parent / 'schedules/update_{0}.json'.format(format), 'r') as f:
            self.data = json.loads(f.read())

    def _update_gameresult(self, gi, teamName, is_home):
        team = Team.objects.get(name=teamName)
        gameresult = Gameresult.objects.get(gameinfo=gi, isHome=is_home)
        gameresult.team = team
        gameresult.isHome = is_home
        gameresult.gameinfo = gi
        gameresult.save()

    def update(self):
        gmw = GamedayModelWrapper(self.gameday_id)
        for update_entry in self.data:
            if gmw.is_finished(update_entry['pre_finished']) and not gmw.is_finished(update_entry['name']):
                entry = UpdateEntry(update_entry)
                qs = Gameinfo.objects.filter(gameday_id=self.gameday_id, standing=entry.get_name())
                for gi, game in zip(qs, entry):
                    if game.home.stage:
                        home = gmw.get_team_by_qualify_for(game.home.place, game.home.index)
                    else:
                        home = gmw.get_team_by(game.home.place, game.home.standing,
                                               game.home.points)
                    if game.away.stage:
                        away = gmw.get_team_by_qualify_for(game.away.place, game.away.index)
                    else:
                        away = gmw.get_team_by(game.away.place, game.away.standing,
                                               game.away.points)
                    self._update_gameresult(gi, home, True)
                    self._update_gameresult(gi, away, False)
                    if gmw.is_finished(game.officials.pre_finished):
                        if game.officials.stage:
                            officialsTeamName = gmw.get_team_by_qualify_for(
                                game.officials.place, game.officials.index)
                        else:
                            officialsTeamName = gmw.get_team_by(game.officials.place,
                                                                game.officials.standing,
                                                                game.officials.points)
                        officials = Team.objects.get(name=officialsTeamName)
                        if gi.officials != officials:
                            gi.officials = officials
                            gi.save()
