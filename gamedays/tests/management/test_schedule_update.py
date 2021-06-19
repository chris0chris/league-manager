from collections.abc import Iterable
from unittest.mock import patch, MagicMock

from django.test import TestCase

from gamedays.management.schedule_manager import ScheduleCreator, Schedule
from gamedays.management.schedule_update import ScheduleUpdate, UpdateGameEntry, UpdateEntry
from gamedays.service.model_wrapper import GamedayModelWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult, Gameday, Team


class TestScheduleUpdate(TestCase):
    def test_update_7_teams_2_fields(self):
        gameday = DBSetup().create_empty_gameday()
        gameday.format = "7_2"
        gameday.save()
        group_B = DBSetup().create_teams('B', 3)
        group_A = DBSetup().create_teams('A', 4)
        groups = [group_A, group_B]
        DBSetup().create_playoff_placeholder_teams()
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()
        all_games = Gameresult.objects.all()
        index = 0

        Gameinfo.objects.filter(stage='Vorrunde').update(status='beendet')
        finished_games = Gameinfo.objects.filter(status='beendet')
        t = list(Team.objects.all())
        for game in finished_games:
            self.update_gameresults(game)
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        semifinals = Gameinfo.objects.filter(standing='HF')
        for hf in semifinals:
            self.update_gameresults(hf)
        semifinals.update(status='beendet')
        su.update()

        p5_first = Gameinfo.objects.filter(standing__in=['P5-1', 'P3'])
        for game in p5_first:
            self.update_gameresults(game)
        p5_first.update(status='beendet')
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()

        p5_first = Gameinfo.objects.filter(standing__in=['P5-2', 'P1'])
        for game in p5_first:
            self.update_gameresults(game)
        p5_first.update(status='beendet')

        gmw = GamedayModelWrapper(gameday.pk)
        qt = gmw.get_schedule()
        f = gmw.get_final_table()
        s = ''

    def update_gameresults(self, game):
        results = Gameresult.objects.filter(gameinfo=game)
        assert results.count() == 2
        result_1: Gameresult = results[0]
        result_2: Gameresult = results[1]
        result_1.fh = result_1.team.pk
        result_1.sh = result_1.team.pk
        result_1.pa = 2 * result_2.team.pk
        result_1.save()
        result_2.fh = result_2.team.pk
        result_2.sh = result_2.team.pk
        result_2.pa = 2 * result_1.team.pk
        result_2.save()

    def test_update_semifinal_and_p5(self):
        gameday = DBSetup().g62_qualify_finished()

        info_p5 = Gameinfo.objects.get(standing='P5')
        results_p5 = Gameresult.objects.filter(gameinfo=info_p5)
        assert results_p5[0].team.name == 'A3'
        assert results_p5[1].team.name == 'B3'

        info_semifinals = Gameinfo.objects.filter(standing='HF')
        results_sf1_qs = Gameresult.objects.filter(gameinfo=info_semifinals[0])
        assert results_sf1_qs[0].team.name == 'B2'
        assert results_sf1_qs[1].team.name == 'A1'

        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()

        assert results_p5[0].team.name == 'A3'
        assert results_p5[1].team.name == 'B3'

        assert results_sf1_qs[0].team.name == 'B2'
        assert results_sf1_qs[1].team.name == 'A1'

        results_sf2_qs = Gameresult.objects.filter(gameinfo=info_semifinals[1])
        assert results_sf2_qs[0].team.name == 'A2'
        assert results_sf2_qs[1].team.name == 'B1'

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
        assert games.filter(officials__name__exact='teamName').count() == 3
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        assert games[sf1].officials.name == 'B3'
        assert games[sf2].officials.name == 'A3'
        # P5 will be updated, when SF are finished
        assert games.filter(officials__name__exact='teamName').count() == 1


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
