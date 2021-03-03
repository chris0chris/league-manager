from collections.abc import Iterable
from unittest.mock import patch, MagicMock

from django.test import TestCase

from gamedays.management.schedule_update import ScheduleUpdate, UpdateGameEntry, UpdateEntry
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult


class TestScheduleUpdate(TestCase):

    def test_update_semifinal_and_p5(self):
        gameday = DBSetup().g62_qualify_finished()

        info_p5 = Gameinfo.objects.get(standing='P5')
        results_p5 = Gameresult.objects.filter(gameinfo=info_p5)
        assert results_p5[0].team == 'P5_home'
        assert results_p5[1].team == 'P5_away'

        info_semifinals = Gameinfo.objects.filter(standing='HF')
        results_sf1_qs = Gameresult.objects.filter(gameinfo=info_semifinals[0])
        assert results_sf1_qs[0].team == 'HF_home'
        assert results_sf1_qs[1].team == 'HF_away'

        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()

        assert results_p5[0].team == 'A3'
        assert results_p5[1].team == 'B3'

        assert results_sf1_qs[0].team == 'B2'
        assert results_sf1_qs[1].team == 'A1'

        results_sf2_qs = Gameresult.objects.filter(gameinfo=info_semifinals[1])
        assert results_sf2_qs[0].team == 'A2'
        assert results_sf2_qs[1].team == 'B1'

    @patch.object(ScheduleUpdate, '_update_gameresult')
    def test_update_semifinal_is_not_overridden(self, create_mock: MagicMock):
        gameday = DBSetup().g62_finalround(sf='beendet', p5='beendet')

        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        assert create_mock.call_count == 4, 'only games for P3 and P1 should be created'

    @patch.object(ScheduleUpdate, '_update_gameresult')
    def test_update_qualify_not_finished(self, create_mock: MagicMock):
        gameday = DBSetup().g62_status_empty()
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        create_mock.assert_not_called()

    def test_officials_update(self):
        gameday = DBSetup().g62_qualify_finished()
        games = Gameinfo.objects.filter(standing='HF') | Gameinfo.objects.filter(standing='P5')
        sf1 = 0
        sf2 = 1
        assert games.filter(officials__exact='').count() == 3
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        assert games[sf1].officials == 'B3'
        assert games[sf2].officials == 'A3'
        # P5 will be updated, when SF are finished
        assert games.filter(officials__exact='').count() == 1


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
            },
            "officials": {
                "pre-finished": "HF",
                "standing": "HF",
                "points": 3,
                "place": 1
            }
        })
        assert uge.get_place('home') == 3
        assert uge.get_standing('home') == 'Gruppe 1'
        assert uge.get_points('home') is None
        assert uge.get_pre_finished('home') is None
        assert uge.get_place('away') == 1
        assert uge.get_standing('away') == 'Gruppe 2'
        assert uge.get_points('away') == 0
        assert uge.get_place('officials') == 1
        assert uge.get_standing('officials') == 'HF'
        assert uge.get_points('officials') == 3
        assert uge.get_pre_finished('officials') == 'HF'


class TestUpdateEntry:

    def test_ue_get_methods(self):
        ue = UpdateEntry({
            "name": "P5",
            "games": []
        })
        assert ue.get_name() == 'P5'
        assert isinstance(ue, Iterable)
