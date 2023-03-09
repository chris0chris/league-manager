import datetime
import json
import pathlib
from typing import Union, List

from teammanager.models import Gameday, Gameinfo, Gameresult, Team


class TeamNotExistent(BaseException):
    pass


class ScheduleTeamMismatchError(BaseException):
    pass


class ScheduleEntry:
    def __init__(self, schedule_entry: dict):
        self.stage = schedule_entry['stage']
        self.standing = schedule_entry['standing']
        self.home = schedule_entry['home']
        self.away = schedule_entry['away']
        self.officials = schedule_entry['official']
        self.break_after = schedule_entry.get('break_after', 0)

    def __repr__(self):
        return f'ScheduleEntry({{break_before: {self.break_after}, stage: "{self.stage}", ' \
               f'standing: "{self.standing}", home: "{self.home}", away: "{self.away}", official: "{self.officials}"}}'


class EmptyScheduleEntry:
    def __repr__(self):
        return f'EmptyScheduleEntry()'


class FieldSchedule:
    def __init__(self, field: str, games: []):
        self.field = field
        self.games = self._create_schedule_entries(games)

    # noinspection PyMethodMayBeStatic
    def _create_schedule_entries(self, games):
        entries: List[Union[ScheduleEntry, EmptyScheduleEntry]] = []
        for game in games:
            if len(game) == 0:
                entries = entries + [EmptyScheduleEntry()]
            else:
                entries = entries + [ScheduleEntry(game)]
        return entries

    def __repr__(self):
        return f'FieldSchedule(field={self.field}, games={str([schedule_entry for schedule_entry in self.games])})'


class Schedule:
    def __init__(self, gameday_format: str, groups: []):
        self.format = gameday_format
        self.groups = groups
        if not self._format_match_number_of_teams():
            raise ScheduleTeamMismatchError
        self.entries = self._get_entries()

    def _get_entries(self):
        with open(pathlib.Path(__file__).parent / 'schedules/schedule_{0}.json'.format(self.format)) as f:
            data = json.load(f)
        entries = []
        for field_entry in data:
            field = field_entry['field']
            games = field_entry['games']
            entries = entries + [FieldSchedule(field, games)]
        entries = self._replace_placeholders(entries)
        return entries

    def _replace_placeholders(self, entries):
        for field_entry in entries:
            for game in field_entry.games:
                if isinstance(game, ScheduleEntry):
                    game.home = self._replace_placeholder_by_group_entry(game.home)
                    game.away = self._replace_placeholder_by_group_entry(game.away)
                    game.officials = self._replace_placeholder_by_group_entry(game.officials)
        return entries

    def _replace_placeholder_by_group_entry(self, home_placeholder: str):
        # expected format groupIndex_teamIndex: 0_0
        tmp = home_placeholder.split('_')
        # if other format
        if len(tmp) < 2:
            return home_placeholder
        group_index = int(tmp[0])
        team_index = int(tmp[1])
        return self.groups[group_index][team_index]

    def _format_match_number_of_teams(self):
        number_of_teams = int(self.format.split('_')[0])
        return number_of_teams == sum(len(group) for group in self.groups)


class ScheduleCreator:
    DEFAULT_GAME_LENGTH = 70

    def __init__(self, gameday: Gameday, schedule: Schedule):
        self.gameday = gameday
        self.schedule = schedule

    def create(self):
        Gameinfo.objects.filter(gameday_id=self.gameday.pk).delete()
        field_entry: FieldSchedule
        for field_entry in self.schedule.entries:
            scheduled = self.gameday.start
            field = field_entry.field
            for game in field_entry.games:
                if isinstance(game, EmptyScheduleEntry):
                    scheduled = self._calc_next_time_slot(scheduled)
                    continue
                self._create_gameinfo_and_gameresult(game, field, scheduled)
                scheduled = self._calc_next_time_slot(scheduled, game.break_after)

    def _create_gameinfo_and_gameresult(self, game, field, scheduled):
        gameinfo = Gameinfo()
        gameinfo.gameday = self.gameday
        gameinfo.scheduled = scheduled
        gameinfo.stage = game.stage
        gameinfo.field = field
        gameinfo.standing = game.standing
        gameinfo.officials = self._get_team(game.officials)
        gameinfo.save()
        self._create_gameresult(game, gameinfo)

    def _get_team(self, team_name):
        try:
            return Team.objects.get(name=team_name)
        except Team.DoesNotExist:
            Gameinfo.objects.filter(gameday_id=self.gameday.pk).delete()
            raise TeamNotExistent(team_name)

    def _create_gameresult(self, game: ScheduleEntry, gameinfo: Gameinfo):
        home = Gameresult()
        home.gameinfo = gameinfo
        home.team = self._get_team(game.home)
        home.isHome = True
        home.save()
        away = Gameresult()
        away.gameinfo = gameinfo
        away.team = self._get_team(game.away)
        away.save()

    # noinspection PyMethodMayBeStatic
    def _calc_next_time_slot(self, scheduled, break_before=0):
        scheduled_to_datetime_object = datetime.datetime.combine(datetime.date(1, 1, 1), scheduled)
        slot_length = self.DEFAULT_GAME_LENGTH + break_before
        new_scheduled_time = (scheduled_to_datetime_object + datetime.timedelta(minutes=slot_length)).time()
        return new_scheduled_time
