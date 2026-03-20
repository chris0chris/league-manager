import pytest
from django.test import TestCase

from gamedays.management.schedule_manager import (
    TeamNotExistent,
    ScheduleTeamMismatchError,
    ScheduleCreator,
    Schedule,
    ScheduleEntry,
    FieldSchedule,
    EmptyScheduleEntry,
    GroupSchedule,
)
from gamedays.models import Gameday, Gameinfo, Gameresult
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_table.tests.setup_factories.factories_leaguetable import LeagueGroupFactory


class TestScheduleEntry:
    def test_schedule_entry(self):
        se = ScheduleEntry.from_dict(
            {
                "stage": "Vorrunde",
                "standing": "Gruppe 1",
                "home": "Heim",
                "away": "Gast",
                "official": "Schiri",
            }
        )
        assert se.stage == "Vorrunde"
        assert se.standing == "Gruppe 1"
        assert se.home == "Heim"
        assert se.away == "Gast"
        assert se.officials == "Schiri"
        assert se.league_group is None
        assert se.break_after == 0


class TestFieldSchedule:
    def test_entries_correct_created(self):
        games = [
            {},
            {
                "stage": "Vorrunde",
                "standing": "Gruppe 1",
                "home": "Heim",
                "away": "Gast",
                "official": "Schiri",
            },
        ]
        field_schedule = FieldSchedule("1", games)
        assert len(field_schedule.games) == 2
        assert isinstance(field_schedule.games[0], EmptyScheduleEntry)


class TestSchedule:
    def test_schedule_loaded_for_4_teams(self):
        groups = [
            GroupSchedule(
                name="some group", league_group=None, teams=["A1", "A2", "A3", "A4"]
            )
        ]
        schedule = Schedule("4_1", groups)
        assert len(schedule.entries) == 1
        assert schedule.entries[0].field == "1"
        assert len(schedule.entries[0].games) == 6
        first_game = 0
        last_game = 5
        assert schedule.entries[0].games[first_game].home == "A1"
        assert schedule.entries[0].games[first_game].away == "A4"
        assert schedule.entries[0].games[first_game].officials == "A2"
        assert schedule.entries[0].games[last_game].home == "A1"
        assert schedule.entries[0].games[last_game].away == "A2"
        assert schedule.entries[0].games[last_game].officials == "A4"

    def test_schedule_loaded_for_5_teams_2_fields_dffl1(self):
        groups = [
            GroupSchedule(
                name="some group",
                league_group=None,
                teams=["A1", "A2", "A3", "A4", "A5"],
            )
        ]
        schedule = Schedule("5_dffl1_2", groups)
        assert len(schedule.entries) == 2
        assert schedule.entries[0].field == "1"
        assert schedule.entries[1].field == "2"
        assert len(schedule.entries[0].games) == 5
        first_game = 0
        last_game = 4
        assert schedule.entries[0].games[first_game].home == "A1"
        assert schedule.entries[0].games[first_game].away == "A2"
        assert schedule.entries[0].games[first_game].officials == "A5"
        assert schedule.entries[0].games[last_game].home == "A4"
        assert schedule.entries[0].games[last_game].away == "A5"
        assert schedule.entries[0].games[last_game].officials == "A1"

    def test_schedule_throws_exception_format_and_groups_dont_fit(self):
        groups = [
            GroupSchedule(
                name="some group A", league_group=None, teams=["A1", "A2", "A3", "A4"]
            ),
            GroupSchedule(
                name="some group B", league_group=None, teams=["B1", "B2", "B3"]
            ),
        ]
        with pytest.raises(ScheduleTeamMismatchError):
            Schedule("6_2", groups)


class TestScheduleCreator(TestCase):
    def test_schedule_created_for_4_teams(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams("A", 4)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk),
            schedule=Schedule("4_1", [GroupSchedule("Group 1", None, group_A)]),
        )
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=gameday.pk)
        assert gameinfo_set.count() == 6
        gameinfo: Gameinfo = gameinfo_set.first()
        assert gameinfo.officials.name == "A2"
        assert gameinfo.standing == "Group 1"
        assert str(gameinfo_set.last().scheduled) == "15:50:00"
        assert Gameresult.objects.filter(gameinfo=gameinfo).count() == 2
        assert Gameresult.objects.all().count() == 12

    def test_schedule_created_for_4_teams_with_league_group(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        league_group = LeagueGroupFactory(
            name="A league group", season=gameday.season, league=gameday.league
        )
        group_A = DBSetup().create_teams("A", 4)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk),
            schedule=Schedule(
                "4_1", [GroupSchedule(league_group.name, league_group, group_A)]
            ),
        )
        sc.create()
        gameinfo = Gameinfo.objects.filter(gameday_id=gameday.pk).first()
        assert gameinfo.league_group == league_group

    def test_schedule_created_for_5_teams_dffl1(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams("A", 5)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        groups = [GroupSchedule(name="group_A", league_group=None, teams=group_A)]
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk),
            schedule=Schedule("5_dffl1_2", groups),
        )
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=gameday.pk)
        assert gameinfo_set.count() == 10
        gameinfo: Gameinfo = gameinfo_set.first()
        assert gameinfo.officials.name == "A5"
        assert gameinfo.standing == "group_A"
        assert gameinfo.league_group is None
        assert str(gameinfo.scheduled) == "10:00:00"
        assert str(gameinfo_set.last().scheduled) == "16:40:00"
        assert Gameresult.objects.filter(gameinfo=gameinfo).count() == 2
        assert Gameresult.objects.all().count() == 20

    def test_schedule_created_for_6_teams_and_2_fields(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams("A", 3)
        group_B = DBSetup().create_teams("B", 3)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        groups = [
            GroupSchedule(name="Gruppe 1", league_group=None, teams=group_A),
            GroupSchedule(name="Gruppe 2", league_group=None, teams=group_B),
        ]
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule("6_2", groups)
        )
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=gameday.pk)
        assert gameinfo_set.count() == 11
        gameinfo = gameinfo_set.first()
        assert gameinfo.officials.name == "B3"
        assert gameinfo.standing == "Gruppe 1"
        assert str(gameinfo.scheduled) == "10:00:00"
        assert str(gameinfo.field) == "1"
        assert Gameresult.objects.filter(gameinfo=gameinfo).count() == 2
        assert Gameresult.objects.all().count() == 22
        assert str(gameinfo_set.get(standing="P5").scheduled) == "14:40:00"
        assert str(gameinfo_set.get(standing="P5").field) == "2"

    def test_schedule_created_for_schedule_with_one_slot_pause(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams("A", 4)
        group_B = DBSetup().create_teams("B", 3)
        groups = [
            GroupSchedule(name="Gruppe 1", league_group=None, teams=group_A),
            GroupSchedule(name="Gruppe 2", league_group=None, teams=group_B),
        ]
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule("7_2", groups)
        )
        sc.create()
        p1_game: Gameinfo = Gameinfo.objects.get(gameday=gameday, standing="P1")
        assert p1_game.field == 1
        assert p1_game.scheduled.strftime("%H:%M") == "18:10"
        last_game_field_2: Gameinfo = Gameinfo.objects.get(
            gameday=gameday, standing="P5-2"
        )
        assert last_game_field_2.field == 2
        assert last_game_field_2.scheduled.strftime("%H:%M") == "18:10"

    def test_schedule_only_created_once_if_created_twice(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams("A", 3)
        group_B = DBSetup().create_teams("B", 3)
        groups = [
            GroupSchedule(name="Gruppe 1", league_group=None, teams=group_A),
            GroupSchedule(name="Gruppe 2", league_group=None, teams=group_B),
        ]
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule("6_2", groups)
        )
        sc.create()
        first_gameinfo_creation = Gameinfo.objects.filter(gameday_id=gameday.pk).first()
        sc = ScheduleCreator(
            gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule("6_2", groups)
        )
        sc.create()
        assert Gameinfo.objects.filter(pk=first_gameinfo_creation.pk).exists() is False
        assert (
            Gameresult.objects.filter(gameinfo=first_gameinfo_creation).exists()
            is False
        )
        assert Gameinfo.objects.filter(gameday=gameday).count() == 11

    def test_schedule_not_created_while_team_not_existent(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        DBSetup().create_teams("A", 3)
        DBSetup().create_teams("B", 3)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        groups = [
            GroupSchedule(
                name="", league_group=None, teams=["A1", "A2", "unknown team"]
            ),
            GroupSchedule(name="", league_group=None, teams=["B1", "B2", "B3"]),
        ]
        with pytest.raises(TeamNotExistent) as err:
            sc = ScheduleCreator(
                gameday=Gameday.objects.get(pk=gameday.pk),
                schedule=Schedule(gameday.format, groups),
            )
            sc.create()
        assert str(err.value) == "unknown team"
        assert Gameinfo.objects.all().count() == 0
        assert Gameresult.objects.all().count() == 0
