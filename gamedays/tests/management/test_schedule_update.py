from collections.abc import Iterable
from unittest.mock import patch, MagicMock

from django.test import TestCase

from gamedays.management.schedule_update import ScheduleUpdate, UpdateGameEntry, UpdateEntry
from gamedays.models import Gameresult, Gameinfo
from gamedays.tests.testdata.db_setup import DBSetup


class TestScheduleUpdate(TestCase):

    def test_update_semifinal_and_p5(self):
        gameday = DBSetup().g62_qualify_finished()
        semifinals = Gameinfo.objects.filter(standing='HF')
        assert len(Gameresult.objects.filter(gameinfo_id=semifinals[0].pk)) == 0
        assert len(Gameresult.objects.filter(gameinfo_id=semifinals[1].pk)) == 0
        assert len(Gameresult.objects.filter(gameinfo=Gameinfo.objects.get(standing='P5'))) == 0
        su = ScheduleUpdate(gameday.pk)
        su.update()
        results_sf1_qs = Gameresult.objects.filter(gameinfo_id=semifinals[0].pk)
        assert len(results_sf1_qs) == 2
        assert results_sf1_qs[0].team == 'B2'
        assert results_sf1_qs[0].fh is None
        assert results_sf1_qs[1].team == 'A1'
        results_sf2_qs = Gameresult.objects.filter(gameinfo_id=semifinals[1].pk)
        assert len(results_sf2_qs) == 2
        assert results_sf2_qs[0].team == 'A2'
        assert results_sf2_qs[1].team == 'B1'
        assert len(Gameresult.objects.filter(gameinfo=Gameinfo.objects.get(standing='P5'))) == 2
        assert len(Gameresult.objects.filter(gameinfo=Gameinfo.objects.get(standing='P3'))) == 0
        assert len(Gameresult.objects.filter(gameinfo=Gameinfo.objects.get(standing='P1'))) == 0

    @patch.object(ScheduleUpdate, '_create_gameresult')
    def test_update_semifinal_is_not_overridden(self, create_mock: MagicMock):
        gameday = DBSetup().g62_finalround(sf='beendet', p5='beendet')
        su = ScheduleUpdate(gameday.pk)
        su.update()
        assert create_mock.call_count == 4, 'only games for P3 and P1 should be created'
        create_mock.assert_any_call(Gameinfo.objects.get(pk=10), 'B2', True)
        create_mock.assert_any_call(Gameinfo.objects.get(pk=10), 'A2', False)
        create_mock.assert_any_call(Gameinfo.objects.get(pk=11), 'A1', True)
        create_mock.assert_any_call(Gameinfo.objects.get(pk=11), 'B1', False)

    def test_update_no_new_games_created_while_already_existent(self):
        gameday = DBSetup().g62_qualify_finished()
        v = Gameinfo.objects.filter(standing='HF').first().delete()
        semifinal_finished = DBSetup().create_finalround_game(gameday=gameday, standing='HF',
                                                              status='beendet', home='A2', away='B1')
        assert len(Gameresult.objects.filter(gameinfo__in=Gameinfo.objects.filter(standing='HF'))) == 2
        su = ScheduleUpdate(gameday.pk)
        su.update()
        assert len(Gameresult.objects.filter(gameinfo__in=Gameinfo.objects.filter(standing='HF'))) == 4

    @patch.object(ScheduleUpdate, '_create_gameresult')
    def test_update_qualify_not_finished(self, create_mock: MagicMock):
        gameday = DBSetup().g62_status_empty()
        su = ScheduleUpdate(gameday.pk)
        su.update()
        create_mock.assert_not_called()

    def test_officials_update(self):
        gameday = DBSetup().g62_qualify_finished()
        games = Gameinfo.objects.filter(standing='HF') | Gameinfo.objects.filter(standing='P5')
        assert games.exclude(officials__exact='').count() == 0
        su = ScheduleUpdate(gameday.pk)
        su.update()
        assert games.exclude(officials__exact='').count() == 3


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
                "standing": "HF",
                "points": 3,
                "place": 1
            }
        })
        assert uge.get_place('home') == 3
        assert uge.get_standing('home') == 'Gruppe 1'
        assert uge.get_points('home') is None
        assert uge.get_place('away') == 1
        assert uge.get_standing('away') == 'Gruppe 2'
        assert uge.get_points('away') == 0
        assert uge.get_place('officials') == 1
        assert uge.get_standing('officials') == 'HF'
        assert uge.get_points('officials') == 3


class TestUpdateEntry:

    def test_ue_get_methods(self):
        ue = UpdateEntry({
            "name": "P5",
            "games": []
        })
        assert ue.get_name() == 'P5'
        assert isinstance(ue, Iterable)
