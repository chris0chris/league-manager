import datetime
import json
import pathlib
import re
from dataclasses import dataclass
from typing import Union, List, Optional

from gamedays.models import Team, Gameday, Gameinfo, Gameresult
from league_table.models import LeagueGroup


class TeamNotExistent(BaseException):
    pass


class ScheduleTeamMismatchError(BaseException):
    pass


@dataclass
class ScheduleEntry:
    stage: str
    standing: str
    league_group: Optional["LeagueGroup"]
    home: str
    away: str
    officials: str
    break_after: int = 0

    def __repr__(self):
        return (
            f"ScheduleEntry({{break_before: {self.break_after}, "
            f'stage: "{self.stage}", standing: "{self.standing}", league_group: None,'
            f'home: "{self.home}", away: "{self.away}", official: "{self.officials}"}})'
        )

    @classmethod
    def from_dict(cls, schedule_entry: dict) -> "ScheduleEntry":
        """Factory method to create ScheduleEntry from a dict safely."""
        return cls(
            stage=schedule_entry["stage"],
            standing=schedule_entry["standing"],
            league_group=None,
            home=schedule_entry["home"],
            away=schedule_entry["away"],
            officials=schedule_entry["official"],
            break_after=schedule_entry.get("break_after", 0),
        )


class EmptyScheduleEntry:
    def __repr__(self):
        return f"EmptyScheduleEntry()"


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
                entries = entries + [ScheduleEntry.from_dict(game)]
        return entries

    def __repr__(self):
        return f"FieldSchedule(field={self.field}, games={str([schedule_entry for schedule_entry in self.games])})"


@dataclass
class GroupSchedule:
    name: str
    league_group: Optional["LeagueGroup"]
    teams: list[Team]


class Schedule:
    def __init__(self, gameday_format: str, groups: list[GroupSchedule]):
        self.format = gameday_format
        self.groups = groups
        if not self._format_match_number_of_teams():
            raise ScheduleTeamMismatchError
        self.entries = self._get_entries()

    def _get_entries(self):
        data = self._replace_group_name()
        entries = []
        for field_entry in data:
            field = field_entry["field"]
            games = field_entry["games"]
            entries = entries + [FieldSchedule(field, games)]
        entries = self._replace_placeholders(entries)
        return entries

    def _replace_group_name(self):
        mapping = self._init_mapping()

        with open(
            pathlib.Path(__file__).parent
            / "schedules/schedule_{0}.json".format(self.format),
            encoding="utf-8",
        ) as f:
            text = f.read()

        # Build regex that matches *any* key in mapping — longest first to handle overlaps
        pattern = re.compile(
            "|".join(
                re.escape(k) for k in sorted(mapping.keys(), key=len, reverse=True)
            )
        )

        # Replace all matches in one pass
        new_text = pattern.sub(lambda m: mapping[m.group(0)], text)

        return json.loads(new_text)

    def _init_mapping(self) -> dict[str, str]:
        mapping = {
            "Gruppe 1": "INIT_VALUE",
            "Gruppe 2": "INIT_VALUE",
            "Gruppe 3": "INIT_VALUE",
        }

        # Update mapping from self.group
        for i, group in enumerate(self.groups, start=1):
            if i <= len(mapping):
                key = f"Gruppe {i}"
                # i - 1 -> use the index of the group to replace the standing so later the standing knows which league group to replace
                mapping[key] = str(i - 1) if group.league_group else group.name
        return mapping

    def _replace_placeholders(self, entries):
        for field_entry in entries:
            for game in field_entry.games:
                if isinstance(game, ScheduleEntry):
                    game.home = self._replace_placeholder_by_group_entry(game.home)
                    game.away = self._replace_placeholder_by_group_entry(game.away)
                    game.officials = self._replace_placeholder_by_group_entry(
                        game.officials
                    )
                    try:
                        league_group_index = int(game.standing)
                        league_group = self.groups[league_group_index].league_group
                        game.standing = league_group.name
                        game.league_group = league_group
                    except ValueError:
                        pass
        return entries

    def _replace_placeholder_by_group_entry(self, home_placeholder: str):
        # expected format groupIndex_teamIndex: 0_0
        tmp = home_placeholder.split("_")
        # if other format
        if len(tmp) < 2:
            return home_placeholder
        group_index = int(tmp[0])
        team_index = int(tmp[1])
        return self.groups[group_index].teams[team_index]

    def _format_match_number_of_teams(self):
        number_of_teams = int(self.format.split("_")[0])
        sum_of_teams = 0
        for group in self.groups:
            sum_of_teams += len(group.teams)
        return number_of_teams == sum_of_teams


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
        gameinfo.league_group = game.league_group
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
        scheduled_to_datetime_object = datetime.datetime.combine(
            datetime.date(1, 1, 1), scheduled
        )
        slot_length = self.DEFAULT_GAME_LENGTH + break_before
        new_scheduled_time = (
            scheduled_to_datetime_object + datetime.timedelta(minutes=slot_length)
        ).time()
        return new_scheduled_time
