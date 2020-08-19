import unittest

from django.test import TestCase

from gamedays.management.schedule_creator import ScheduleCreator, Schedule, ScheduleEntry
from gamedays.models import Gameinfo, Gameday, Gameresult


class TestSchedule(unittest.TestCase):
    def test_schedule_loaded(self):
        groups = [['Iser', 'Nieder', 'Wesel'], ['Dort', 'Pandas', 'Rheda']]
        schedule = Schedule(2, groups)
        entries = schedule.get_entries()
        self.assertEqual(len(entries), 11)
        entry = entries[0]
        self.assertEqual(entry.get_home(), 'Iser')
        self.assertEqual(entry.get_away(), 'Nieder')
        self.assertEqual(entry.get_official(), 'Rheda')
        entry = entries[5]
        self.assertEqual(entry.get_home(), 'Pandas')
        self.assertEqual(entry.get_away(), 'Rheda')
        self.assertEqual(entry.get_official(), 'Iser')


class TestScheduleEntry(unittest.TestCase):
    def test_schedule_entry(self):
        se = ScheduleEntry(
            {"scheduled": "10:00", "stage": "Vorrunde", "standing": "Gruppe 1", "field": "1", "home": "Heim",
             "away": "Gast", "official": "Schiri"})
        self.assertEqual(se.get_scheduled(), '10:00')
        self.assertEqual(se.get_stage(), 'Vorrunde')
        self.assertEqual(se.get_standing(), 'Gruppe 1')
        self.assertEqual(se.get_field(), '1')
        self.assertEqual(se.get_home(), 'Heim')
        self.assertEqual(se.get_away(), 'Gast')
        self.assertEqual(se.get_official(), 'Schiri')


class TestScheduleCreator(TestCase):
    fixtures = ['testdata.json']

    def test_schedule_created(self):
        self.assertFalse(Gameinfo.objects.filter(gameday_id=2).exists())
        groups = [['Iser', 'Nieder', 'Wesel'], ['Dort', 'Pandas', 'Rheda']]
        sc = ScheduleCreator(gameday=Gameday.objects.filter(pk=2).first(), schedule=Schedule(2, groups))
        sc.create()
        gameinfo_set = Gameinfo.objects.filter(gameday_id=2)
        self.assertEqual(gameinfo_set.count(), 11)
        gameinfo = gameinfo_set.first()
        self.assertEqual(gameinfo.officials, 'Rheda')
        self.assertEqual(Gameresult.objects.filter(gameinfo_id=gameinfo.pk).count(), 2)
        self.assertFalse(Gameresult.objects.filter(gameinfo_id=gameinfo_set.last().pk).exists())
