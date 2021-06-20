import pytest
from django.test import TestCase

from gamedays.management.schedule_manager import ScheduleCreator, Schedule, ScheduleEntry, TeamNotExistent, \
    ScheduleTeamMismatchError
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameday, Gameinfo, Gameresult


class TestSchedule:
    def test_schedule_throws_exception_format_and_groups_dont_fit(self):
        groups = [['A1', 'A2', 'A3', 'A4'], ['B1', 'B2', 'B3']]
        with pytest.raises(ScheduleTeamMismatchError):
            schedule = Schedule('6_2', groups)

    def test_schedule_loaded(self):
        groups = [['Iser', 'Nieder', 'Wesel'], ['Dort', 'Pandas', 'Rheda']]
        schedule = Schedule('6_2', groups)
        entries = schedule.get_entries()
        assert len(entries) == 11
        entry = entries[0]
        assert entry.get_home() == 'Iser'
        assert entry.get_away() == 'Nieder'
        assert entry.get_official() == 'Rheda'
        entry = entries[5]
        assert entry.get_home() == 'Pandas'
        assert entry.get_away() == 'Rheda'
        assert entry.get_official() == 'Iser'
        p1 = entries[10]
        assert p1.get_home() == 'Gewinner HF1'
        assert p1.get_away() == 'Gewinner HF2'
        assert p1.get_official() == 'Gewinner P3'


class TestScheduleEntry:
    def test_schedule_entry(self):
        se = ScheduleEntry(
            {"scheduled": "10:00", "stage": "Vorrunde", "standing": "Gruppe 1", "field": "1", "home": "Heim",
             "away": "Gast", "official": "Schiri"})
        assert se.get_scheduled() == '10:00'
        assert se.get_stage() == 'Vorrunde'
        assert se.get_standing() == 'Gruppe 1'
        assert se.get_field() == '1'
        assert se.get_home() == 'Heim'
        assert se.get_away() == 'Gast'
        assert se.get_official() == 'Schiri'


class TestScheduleCreator(TestCase):
    def test_schedule_created_for_4_teams_1_group(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams('A', 4)
        # group_B = DBSetup().create_teams('B', 3)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        groups = [group_A]
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule("4_1", groups))
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=gameday.pk)
        assert gameinfo_set.count() == 6
        gameinfo: Gameinfo = gameinfo_set.first()
        assert gameinfo.officials.name == 'A4'
        assert str(gameinfo.scheduled) == '10:00:00'
        assert str(gameinfo_set.last().scheduled) == '15:50:00'
        assert Gameresult.objects.filter(gameinfo=gameinfo).count() == 2
        assert Gameresult.objects.all().count() == 12
        # schedule will be created again and previous entries will be deleted
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule("4_1", groups))
        sc.create()
        assert Gameinfo.objects.filter(pk=gameinfo.pk).exists() is False
        assert Gameresult.objects.filter(gameinfo=gameinfo).exists() is False
        assert Gameinfo.objects.filter(gameday=gameday).count() == 6

    def test_schedule_created(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        group_A = DBSetup().create_teams('A', 3)
        group_B = DBSetup().create_teams('B', 3)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        groups = [group_A, group_B]
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=gameday.pk)
        assert gameinfo_set.count() == 11
        gameinfo = gameinfo_set.first()
        assert gameinfo.officials.name == 'B3'
        assert str(gameinfo.scheduled) == '10:00:00'
        assert Gameresult.objects.filter(gameinfo=gameinfo).count() == 2
        assert Gameresult.objects.all().count() == 22
        assert str(gameinfo_set.get(standing='P1').scheduled) == '15:50:00'
        # schedule will be created again and previous entries will be deleted
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()
        assert Gameinfo.objects.filter(pk=gameinfo.pk).exists() is False
        assert Gameresult.objects.filter(gameinfo=gameinfo).exists() is False
        assert Gameinfo.objects.filter(gameday=gameday).count() == 11

    def test_schedule_not_created_while_team_not_existent(self):
        gameday = DBSetup().create_empty_gameday()
        DBSetup().create_playoff_placeholder_teams()
        DBSetup().create_teams('A', 3)
        DBSetup().create_teams('B', 3)
        assert Gameinfo.objects.filter(gameday_id=gameday.pk).exists() is False
        groups = [['A1', 'A2', 'unknown team'], ['B1', 'B2', 'B3']]
        with pytest.raises(TeamNotExistent) as err:
            sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
            sc.create()
        assert str(err.value) == 'unknown team'
        assert Gameinfo.objects.all().count() == 0
        assert Gameresult.objects.all().count() == 0
