import datetime
from unittest.mock import MagicMock, patch

import pytest
from django.test import TestCase

from gamedays.models import Gameresult, Gameday, Team
from gamedays.service.gameday_form_service import GamedayFormService, GameinfoFormData
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import GameinfoFactory


class DummyTeam:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"Team({self.name})"


@pytest.fixture
def teams():
    return Team(name="HomeTeam"), Team(name="AwayTeam"), Team(name="OfficialsTeam")


class TestGameinfoFormData:

    @pytest.mark.parametrize(
        "field_name", ["game_started", "game_halftime", "game_finished", "fh_home", "sh_home", "fh_away", "sh_away"]
    )
    def test_time_fields_can_be_none(self, teams, field_name):
        """Allow optional time fields to be None."""
        home, away, officials = teams
        data = {
            "home": home,
            "away": away,
            "field": "B",
            "officials": officials,
            "scheduled": datetime.time(9, 0),
            "game_started": None,
            "game_halftime": None,
            "game_finished": None,
            "standing": "",
            "delete": False,
            "fh_home": None,
            "sh_home": None,
            "fh_away": None,
            "sh_away": None,
        }
        form_data = GameinfoFormData(**data)
        assert getattr(form_data, field_name) is None

    def test_create_instance(self, teams):
        home, away, officials = teams
        form_data = GameinfoFormData(
            home=home,
            away=away,
            field="Field A",
            officials=officials,
            scheduled=datetime.time(10, 30),
            game_started=datetime.time(10, 35),
            game_halftime=datetime.time(11, 15),
            game_finished=datetime.time(12, 5),
            standing="Final",
            delete=False,
            fh_home=12,
            sh_home=18,
            fh_away=6,
            sh_away=14,
        )
        assert form_data.home.name == "HomeTeam"
        assert form_data.away.name == "AwayTeam"
        assert form_data.field == "Field A"
        assert form_data.scheduled == datetime.time(10, 30)
        assert form_data.delete is False
        assert form_data.fh_home == 12
        assert form_data.sh_away == 14


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
