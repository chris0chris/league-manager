from collections.abc import Iterable
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings

from gamedays.management.schedule_update import ScheduleUpdate, UpdateGameEntry, UpdateEntry
from gamedays.models import Gameresult, Gameinfo

TESTDATA = 'testdata.json'


@override_settings(SUSPEND_SIGNALS=True)
class TestScheduleUpdate(TestCase):
    fixtures = [TESTDATA]

    def test_update(self):
        gameinfo_id = 135
        hf_gameinfo_id = 136
        assert len(Gameresult.objects.filter(gameinfo_id=hf_gameinfo_id)) == 0
        su = ScheduleUpdate(4)
        su.create_sf()
        assert len(Gameresult.objects.filter(gameinfo_id=hf_gameinfo_id)) == 2

    @patch.object(ScheduleUpdate, '_create_gameresult')
    def test_update_qualify_not_finished(self, create_mock: MagicMock):
        gameday_id = 1
        gi: Gameinfo = Gameinfo.objects.get(id=57)
        gi.status = 'gestartet'
        gi.save()
        su = ScheduleUpdate(gameday_id)
        su.update()
        create_mock.assert_not_called()


class TestUpdateGameEntry:

    def test_get_methods(self):
        uge = UpdateGameEntry({
            "home": {
                "standing": "Gruppe 1",
                "place": 3
            },
            "away": {
                "standing": "Gruppe 2",
                "points": 0,
                "place": 1
            }
        })
        assert uge.get_place('home') == 3
        assert uge.get_standing('home') == 'Gruppe 1'
        assert uge.get_points('home') is None
        assert uge.get_place('away') == 1
        assert uge.get_standing('away') == 'Gruppe 2'
        assert uge.get_points('away') == 0


class TestUpdateEntry:

    def test_ue_get_methods(self):
        ue = UpdateEntry({
            "name": "P5",
            "games": []
        })
        assert ue.get_name() == 'P5'
        assert isinstance(ue, Iterable)
