from django.test import TestCase

from gamedays.service.gameday_service import GamedayService, EmptySchedule, EmptyQualifyTable, EmptyFinalTable


class TestGamedayService(TestCase):

    def test_get_empty_gameday_to_html(self):
        gs = GamedayService.create(None)
        assert gs.get_schedule().to_html() == EmptySchedule.to_html()
        assert gs.get_qualify_table().to_html() == EmptyQualifyTable.to_html()
        assert gs.get_final_table().to_html() == EmptyFinalTable.to_html()

    def test_get_empty_gameday_to_json(self):
        gs = GamedayService.create(None)
        assert gs.get_schedule().to_json() == EmptySchedule.to_json()
        assert gs.get_qualify_table().to_json() == EmptyQualifyTable.to_json()
        assert gs.get_final_table().to_json() == EmptyFinalTable.to_json()
