from unittest.mock import patch, MagicMock
from django.test import TestCase
from gamedays.management.schedule_update import ScheduleUpdate
from gamedays.models import Gameinfo, Gameday
from gamedays.service.schedule_resolution_service import GamedayScheduleResolutionService
from gamedays.tests.setup_factories.db_setup import DBSetup
from gameday_designer.models import TemplateApplication, ScheduleTemplate

class TestSignalsDualLogic(TestCase):
    def setUp(self):
        self.db_setup = DBSetup()
        self.db_setup.g62_status_empty()
        self.gameday = Gameday.objects.first()

    @patch.object(ScheduleUpdate, "update")
    @patch("gamedays.service.schedule_resolution_service.GamedayScheduleResolutionService.update_participants")
    def test_signal_uses_legacy_logic_when_no_template_application(self, res_service_mock, update_mock):
        gi = Gameinfo.objects.filter(gameday=self.gameday).first()
        gi.status = "beendet"
        gi.save()
        
        update_mock.assert_called_once()
        res_service_mock.assert_not_called()

    @patch.object(ScheduleUpdate, "update")
    @patch("gamedays.service.schedule_resolution_service.GamedayScheduleResolutionService.update_participants")
    @patch("gamedays.service.model_wrapper.GamedayModelWrapper.is_finished")
    def test_signal_uses_designer_logic_when_template_application_exists(self, is_finished_mock, res_service_mock, update_mock):
        # Setup Designer Gameday
        template = ScheduleTemplate.objects.create(
            name="Test Template",
            num_teams=6,
            num_fields=2
        )
        TemplateApplication.objects.create(
            gameday=self.gameday,
            template=template,
            team_mapping={}
        )
        
        is_finished_mock.return_value = True
        
        gi = Gameinfo.objects.filter(gameday=self.gameday).first()
        gi.status = "beendet"
        gi.save()
        
        update_mock.assert_not_called()
        # Should be called for both standing and stage
        assert res_service_mock.call_count == 2
