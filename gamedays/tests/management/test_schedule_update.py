from collections.abc import Iterable
from unittest.mock import patch, MagicMock

from django.test import TransactionTestCase

from gamedays.management.schedule_manager import (
    ScheduleCreator,
    Schedule,
    GroupSchedule,
)
from gamedays.management.schedule_update import ScheduleUpdate, UpdateGameEntry, UpdateEntry
from gamedays.models import Gameday, Gameinfo, Gameresult
from gamedays.service.model_wrapper import GamedayModelWrapper
from gamedays.tests.setup_factories.dataframe_setup import DataFrameAssertion
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_table.tests.setup_factories.db_setup_leaguetable import LEAGUE_TABLE_TEST_RULESET
from league_table.tests.setup_factories.factories_leaguetable import (
    LeagueSeasonConfigFactory,
)


def update_gameresults(game):
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


class StandingWrapper:
    def __init__(self, gameinfo: Gameinfo):
        self.gameinfo = gameinfo

    def is_updated_as_expected_with(self, expected_home_team, expected_away_team, expected_official_team):
        home: Gameresult = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=True)
        away: Gameresult = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=False)
        assert home.team.name == expected_home_team, 'home team doesnt match expected'
        assert away.team.name == expected_away_team, 'away team doesnt match expected'
        assert self.gameinfo.officials.name == expected_official_team, 'official team doesnt match expected'


def check_if_first_standing(standing):
    return StandingWrapper(Gameinfo.objects.filter(standing=standing).exclude(status='beendet').first())


def update_gameresults_by_standing_and_finish_game_for(standing: str):
    games_for_standing = Gameinfo.objects.filter(standing=standing).exclude(status='beendet')
    for game in games_for_standing:
        update_gameresults(game)
    games_for_standing.update(status='beendet')


def update_gameresults_and_finish_first_game_for_P7():
    game: Gameinfo = Gameinfo.objects.filter(standing='P7').exclude(status='beendet').first()
    update_gameresults(game)
    game.status = 'beendet'
    game.save()


class TestScheduleUpdate(TransactionTestCase):
    reset_sequences = True

    def test_update_less_than_5_teams_dont_throws_error(self):
        gameday = DBSetup().create_empty_gameday()
        gameday.format = "5_2"
        gameday.save()
        group_A = DBSetup().create_teams('A', 5)
        groups = [GroupSchedule(name='', league_group=None, teams=group_A)]
        DBSetup().create_playoff_placeholder_teams()
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()

        Gameinfo.objects.filter(stage='Hauptrunde').update(status='beendet')
        finished_games = Gameinfo.objects.filter(status='beendet')
        for game in finished_games:
            update_gameresults(game)
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()

    def test_update_7_teams_2_fields(self):
        gameday = DBSetup().create_empty_gameday()
        gameday.format = "6_oneDivision_2"
        gameday.save()
        # group_B = DBSetup().create_teams('B', 3)
        group_A = DBSetup().create_teams('A', 6)
        groups = [GroupSchedule(name='Gruppe 1', league_group=None, teams=group_A)]
        DBSetup().create_playoff_placeholder_teams()
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()

        Gameinfo.objects.filter(stage='Vorrunde').update(status='beendet')
        finished_games = Gameinfo.objects.filter(status='beendet')
        for game in finished_games:
            update_gameresults(game)
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        update_gameresults_by_standing_and_finish_game_for('HF')
        su.update()

        p5_first = Gameinfo.objects.filter(standing__in=['P5-1', 'P3'])
        for game in p5_first:
            update_gameresults(game)
        p5_first.update(status='beendet')
        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()

        p5_first = Gameinfo.objects.filter(standing__in=['P5-2', 'P1'])
        for game in p5_first:
            update_gameresults(game)
        p5_first.update(status='beendet')

    @patch("league_table.service.datatypes.LeagueConfigRuleset.from_ruleset")
    def test_update_9_teams_3_fields(self, mock_get_league_config_ruleset):
        mock_get_league_config_ruleset.return_value = LEAGUE_TABLE_TEST_RULESET
        gameday = DBSetup().create_empty_gameday()
        LeagueSeasonConfigFactory(league=gameday.league, season=gameday.season)
        gameday.format = "9_3"
        gameday.save()
        group_A = DBSetup().create_teams('A', 3)
        group_B = DBSetup().create_teams('B', 3)
        group_C = DBSetup().create_teams('C', 3)
        groups = [GroupSchedule(name='Gruppe 1', league_group=None, teams=group_A), GroupSchedule(name='Gruppe 2', league_group=None, teams=group_B), GroupSchedule(name='Gruppe 3', league_group=None, teams=group_C)]
        DBSetup().create_playoff_placeholder_teams()
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()

        qualify_games = Gameinfo.objects.filter(stage='Vorrunde')
        for game in qualify_games:
            update_gameresults(game)
        Gameinfo.objects.filter(stage='Vorrunde').update(status='beendet')

        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        check_if_first_standing('PO').is_updated_as_expected_with('B2', 'C2', 'C3')
        check_if_first_standing('P7').is_updated_as_expected_with('A1', 'B1', 'B3')

        update_gameresults_by_standing_and_finish_game_for('PO')
        update_gameresults_and_finish_first_game_for_P7()
        su.update()
        check_if_first_standing('HF').is_updated_as_expected_with('C2', 'C3', 'B2')
        check_if_first_standing('P7').is_updated_as_expected_with('B1', 'C1', 'A2')
        check_if_first_standing('P5').is_updated_as_expected_with('A2', 'B2', 'B1')

        update_gameresults_by_standing_and_finish_game_for('HF')
        update_gameresults_and_finish_first_game_for_P7()
        su.update()
        check_if_first_standing('P7').is_updated_as_expected_with('C1', 'A1', 'C2')
        check_if_first_standing('P1').is_updated_as_expected_with('B3', 'C3', 'A1')
        check_if_first_standing('P3').is_updated_as_expected_with('A3', 'C2', 'C1')

        update_gameresults_by_standing_and_finish_game_for('P5')
        update_gameresults_and_finish_first_game_for_P7()
        update_gameresults_by_standing_and_finish_game_for('P3')
        update_gameresults_by_standing_and_finish_game_for('P1')

        gmw = GamedayModelWrapper(gameday.pk)
        DataFrameAssertion.expect(gmw.get_final_table()).to_equal_json('final_table_9_teams')
        DataFrameAssertion.expect(gmw.get_schedule()).to_equal_json('schedule_9_teams_3_fields')

    @patch("league_table.service.datatypes.LeagueConfigRuleset.from_ruleset")
    def test_update_11_teams_3_fields(self, mock_get_league_config_ruleset):
        mock_get_league_config_ruleset.return_value = LEAGUE_TABLE_TEST_RULESET
        gameday = DBSetup().create_empty_gameday()
        LeagueSeasonConfigFactory(league=gameday.league, season=gameday.season)
        gameday.format = "11_3"
        gameday.save()
        group_A = DBSetup().create_teams('A', 4)
        group_B = DBSetup().create_teams('B', 4)
        group_C = DBSetup().create_teams('C', 3)
        groups = [GroupSchedule(name='Gruppe 1', league_group=None, teams=group_A), GroupSchedule(name='Gruppe 2', league_group=None, teams=group_B), GroupSchedule(name='Gruppe 3', league_group=None, teams=group_C)]
        DBSetup().create_playoff_placeholder_teams()
        sc = ScheduleCreator(gameday=Gameday.objects.get(pk=gameday.pk), schedule=Schedule(gameday.format, groups))
        sc.create()

        qualify_games = Gameinfo.objects.filter(stage='Vorrunde')
        for game in qualify_games:
            update_gameresults(game)
        Gameinfo.objects.filter(stage='Vorrunde').update(status='beendet')

        su = ScheduleUpdate(gameday.pk, gameday.format)
        su.update()
        check_if_first_standing('PO').is_updated_as_expected_with('A3', 'C3', 'A1')
        check_if_first_standing('P7').is_updated_as_expected_with('A2', 'B2', 'B1')

        update_gameresults_by_standing_and_finish_game_for('PO')
        update_gameresults_and_finish_first_game_for_P7()
        su.update()
        check_if_first_standing('HF').is_updated_as_expected_with('C2', 'B4', 'A2')
        check_if_first_standing('P7').is_updated_as_expected_with('B2', 'C1', 'A3')
        check_if_first_standing('P5').is_updated_as_expected_with('A3', 'B3', 'Gewinner P10')
        check_if_first_standing('P10').is_updated_as_expected_with('A1', 'B1', 'B3')

        update_gameresults_by_standing_and_finish_game_for('HF')
        update_gameresults_by_standing_and_finish_game_for('P10')
        update_gameresults_and_finish_first_game_for_P7()
        su.update()
        check_if_first_standing('P7').is_updated_as_expected_with('C1', 'A2', 'A1')
        check_if_first_standing('P5').is_updated_as_expected_with('A3', 'B3', 'B1')
        check_if_first_standing('P3').is_updated_as_expected_with('B4', 'A4', 'B2')
        check_if_first_standing('P1').is_updated_as_expected_with('C3', 'C2', 'Gewinner P3')

        update_gameresults_and_finish_first_game_for_P7()
        update_gameresults_by_standing_and_finish_game_for('P5')
        update_gameresults_by_standing_and_finish_game_for('P3')
        su.update()
        check_if_first_standing('P1').is_updated_as_expected_with('C3', 'C2', 'B4')
        update_gameresults_by_standing_and_finish_game_for('P1')

        gmw = GamedayModelWrapper(gameday.pk)

        DataFrameAssertion.expect(gmw.get_schedule()).to_equal_json('schedule_11_teams_3_fields')
        DataFrameAssertion.expect(gmw.get_final_table()).to_equal_json('final_table_11_teams')

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
                "stage": "Vorrunde",
                "place": 0,
                "index": 1
            },
            "officials": {
                "pre_finished": "HF",
                "standing": "HF",
                "points": 2,
                "place": 1
            }
        })
        assert uge.home.place == 3
        assert uge.home.standing == 'Gruppe 1'
        assert uge.home.points is None
        assert uge.home.pre_finished is None
        assert uge.away.place == 0
        assert uge.away.stage == 'Vorrunde'
        assert uge.away.index == 1
        assert uge.officials.place == 1
        assert uge.officials.standing == 'HF'
        assert uge.officials.points == 2
        assert uge.officials.pre_finished == 'HF'


class TestUpdateEntry:

    def test_update_entry_get_methods(self):
        ue = UpdateEntry({
            "name": "P5",
            "games": []
        })
        assert ue.get_name() == 'P5'
        assert isinstance(ue, Iterable)
