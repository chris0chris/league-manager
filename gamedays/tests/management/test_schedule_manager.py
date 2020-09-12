from django.test import TestCase, override_settings

from gamedays.management.schedule_manager import ScheduleCreator, Schedule, ScheduleEntry
from gamedays.models import Gameinfo, Gameday, Gameresult

TESTDATA = 'testdata.json'


class TestSchedule:
    def test_schedule_loaded(self):
        groups = [['Iser', 'Nieder', 'Wesel'], ['Dort', 'Pandas', 'Rheda']]
        schedule = Schedule(2, groups)
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


@override_settings(SUSPEND_SIGNALS=True)
class TestScheduleCreator(TestCase):
    fixtures = [TESTDATA]

    def test_schedule_created(self):
        gameday_id = 3
        self.assertFalse(Gameinfo.objects.filter(gameday_id=gameday_id).exists())
        groups = [['Iser', 'Nieder', 'Wesel'], ['Dort', 'Pandas', 'Rheda']]
        sc = ScheduleCreator(gameday=Gameday.objects.filter(pk=gameday_id).first(), schedule=Schedule(2, groups))
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=gameday_id)
        self.assertEqual(gameinfo_set.count(), 11)
        gameinfo = gameinfo_set.first()
        self.assertEqual(gameinfo.officials, 'Rheda')
        self.assertEqual(Gameresult.objects.filter(gameinfo_id=gameinfo.pk).count(), 2)
        self.assertFalse(Gameresult.objects.filter(gameinfo_id=gameinfo_set.last().pk).exists())
        # schedule will be created again and previous entries will be deleted
        sc.create()
        with self.assertRaises(Gameinfo.DoesNotExist):
            Gameinfo.objects.get(pk=gameinfo.pk)
        self.assertFalse(Gameresult.objects.filter(gameinfo_id=gameinfo.pk).exists())
        self.assertEqual(Gameinfo.objects.filter(gameday_id=gameday_id).count(), 11)
