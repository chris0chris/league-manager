from unittest.mock import MagicMock, patch

from django.test import TestCase

from gamedays.models import Gameresult, Gameday
from gamedays.service.gameday_form_service import GamedayFormService
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import GameinfoFactory


class TestGamedayFormService(TestCase):
    def test_handle_gameinfo_and_gameresult(self):
        expected_gameinfo = GameinfoFactory()
        expected_gameday = DBSetup().create_empty_gameday()
        teams = DBSetup().create_teams('team', 3)

        assert expected_gameinfo.gameday != expected_gameday

        expected_home_results = {
            'gameinfo': expected_gameinfo,
            'team': teams[0],
            'first_half': 12,
            'second_half': 13,
            'points_against': 12,
        }
        expected_away_results = {
            'gameinfo': expected_gameinfo,
            'team': teams[1],
            'first_half': 5,
            'second_half': 7,
            'points_against': 25,
        }
        gameday_form_service = GamedayFormService(expected_gameday)
        gameday_form_service.handle_gameinfo_and_gameresult(
            {
                "home": expected_home_results["team"],
                "away": expected_away_results["team"],
                'field': 1,
                'officials': teams[2],
                'scheduled': '10:00',
                'standing': 'Group 1',
                "gameStarted": "10:00",
                "gameHalftime": "10:30",
                "gameFinished": "11:00",
                "DELETE": False,
                "fh_home": expected_home_results["first_half"],
                "sh_home": expected_home_results["second_half"],
                "fh_away": expected_away_results["first_half"],
                "sh_away": expected_away_results["second_half"],
            },
            expected_gameinfo
        )

        expected_gameinfo.refresh_from_db()
        assert expected_gameinfo.gameday == expected_gameday
        assert expected_gameinfo.standing == "Group 1"

        gameresult_home = Gameresult.objects.get(isHome=True)
        gameresult_away = Gameresult.objects.get(isHome=False)
        gameresult_home.refresh_from_db()
        gameresult_away.refresh_from_db()
        self._check_for_team_properties_for_assertion(
            gameresult_home, expected_home_results
        )
        self._check_for_team_properties_for_assertion(
            gameresult_away, expected_away_results
        )

    @patch("gamedays.service.gameday_form_service.GameinfoFormData")
    def test_handle_gameinfo_deletes_when_flag_set(self, mock_form_class):
        gameday = Gameday(name="G1")
        gameinfo = MagicMock()

        mock_form = MagicMock(delete=True)
        mock_form_class.from_mapping.return_value = mock_form

        service = GamedayFormService(gameday)
        service.handle_gameinfo_and_gameresult({}, gameinfo)

        gameinfo.delete.assert_called_once()
        mock_form_class.from_mapping.assert_called_once_with({})

    # noinspection PyMethodMayBeStatic
    def _check_for_team_properties_for_assertion(self, team_result: Gameresult, expected_result: dict):
        actual = {
            "gameinfo": team_result.gameinfo,
            "team": team_result.team,
            "first_half": team_result.fh,
            "second_half": team_result.sh,
            "points_against": team_result.pa,
        }
        assert actual == expected_result

    def test_calc_points_against_returns_sum(self):
        assert GamedayFormService._calc_points_against(6, 12) == 18
        assert GamedayFormService._calc_points_against(None, 12) is None
        assert GamedayFormService._calc_points_against(10, None) == 10
