from unittest.mock import patch

from django.test import TestCase

from gamedays.management.schedule_update import ScheduleUpdate
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo


class TestSignals(TestCase):

    @patch.object(ScheduleUpdate, 'update')
    def test_schedule_is_updated(self, update_mock):
        DBSetup().g62_status_empty()

        gi: Gameinfo = Gameinfo.objects.first()
        gi.status = 'beendet'
        gi.save()
        update_mock.assert_called_once()
