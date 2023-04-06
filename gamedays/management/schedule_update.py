import json
import pathlib

from gamedays.models import Team, Gameday, Gameinfo, Gameresult
from gamedays.service.model_wrapper import GamedayModelWrapper


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
        number_of_teams = int(format.split('_')[0])
        if number_of_teams > 5 and not Gameday.objects.get(pk=gameday_id).league.name == 'SFL':
            with open(pathlib.Path(__file__).parent / 'schedules/update_{0}.json'.format(format), 'r') as f:
                self.data = json.loads(f.read())
        else:
            self.data = {}

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
                game: UpdateGameEntry
                gi: Gameinfo
                for gi, game in zip(qs, entry):
                    if game.home.stage:
                        home = gmw.get_team_by_qualify_for(game.home.place, game.home.index)
                    elif game.home.aggregate_standings:
                        home = gmw.get_team_aggregate_by(game.home.aggregate_standings,
                                                         game.home.aggregate_place,
                                                         game.home.place)
                    elif game.home.first_match:
                        teams = gmw.get_teams_by(game.home.standing, game.home.points)
                        for entry_to_match in game.home.first_match:
                            if entry_to_match.aggregate_standings:
                                potential_team = gmw.get_team_aggregate_by(entry_to_match.aggregate_standings,
                                                                           entry_to_match.aggregate_place,
                                                                           entry_to_match.place)
                            else:
                                potential_team = gmw.get_team_by(entry_to_match.place,
                                                                 entry_to_match.standing,
                                                                 entry_to_match.points)
                            if potential_team in teams:
                                home = potential_team
                                break
                    else:
                        home = gmw.get_team_by(game.home.place, game.home.standing,
                                               game.home.points)
                    if game.away.stage:
                        away = gmw.get_team_by_qualify_for(game.away.place, game.away.index)
                    elif game.away.aggregate_standings:
                        away = gmw.get_team_aggregate_by(game.away.aggregate_standings,
                                                         game.away.aggregate_place,
                                                         game.away.place)
                    elif game.away.first_match:
                        teams = gmw.get_teams_by(game.away.standing, game.away.points)
                        for entry_to_match in game.away.first_match:
                            if entry_to_match.aggregate_standings:
                                potential_team = gmw.get_team_aggregate_by(entry_to_match.aggregate_standings,
                                                                           entry_to_match.aggregate_place,
                                                                           entry_to_match.place)
                            else:
                                potential_team = gmw.get_team_by(entry_to_match.place,
                                                                 entry_to_match.standing,
                                                                 entry_to_match.points)
                            if potential_team in teams:
                                away = potential_team
                                break
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
