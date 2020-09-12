from django.test import TestCase, override_settings

from gamedays.service.gameday_service import GamedayService, EmptySchedule, EmptyQualifyTable, EmptyFinalTable

TESTDATA_FIXTURE = 'testdata.json'


@override_settings(SUSPEND_SIGNALS=True)
class TestGamedayService(TestCase):
    fixtures = [TESTDATA_FIXTURE]

    def test_get_empty_gameday(self):
        empty_gameday_pk = 3
        gs = GamedayService.create(empty_gameday_pk)
        assert gs.get_schedule().to_html() == EmptySchedule.to_html()
        assert gs.get_qualify_table().to_html() == EmptyQualifyTable.to_html()
        assert gs.get_final_table().to_html() == EmptyFinalTable.to_html()
