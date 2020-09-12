from unittest.mock import patch

from django.test import TestCase, override_settings

from gamedays.management.schedule_update import ScheduleUpdate
from gamedays.models import Gameinfo

TESTDATA = 'testdata.json'


@override_settings(SUSPEND_SIGNALS=True)
class TestSignals(TestCase):
    fixtures = [TESTDATA]

    @override_settings(SUSPEND_SIGNALS=False)
    @patch.object(ScheduleUpdate, 'update')
    def test_schedule_is_updated(self, update_mock):
        gi: Gameinfo = Gameinfo.objects.get(id=57)
        gi.status = 'beendet'
        gi.save()
        update_mock.assert_called_once()
