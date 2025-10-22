from django.test import TestCase

from gamedays.models import Gameinfo, Gameresult
from gamedays.service.gameday_form_service import GamedayFormService
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayFormService(TestCase):
    def test_handle_gameinfo_and_gameresult(self):
        DBSetup().g62_status_empty()
        expected_gameday = DBSetup().create_empty_gameday()
        teams = DBSetup().create_teams('team', 3)
        last_gameinfo: Gameinfo = Gameinfo.objects.last()
        assert last_gameinfo.gameday != expected_gameday

        gameresult_home = Gameresult.objects.get(gameinfo=last_gameinfo, isHome=True)
        gameresult_away = Gameresult.objects.get(gameinfo=last_gameinfo, isHome=False)
        assert gameresult_home.team != teams[0]
        assert gameresult_away.team != teams[1]

        gameday_form_service = GamedayFormService(expected_gameday)
        gameday_form_service.handle_gameinfo_and_gameresult(
            {
                'home': teams[0],
                'away': teams[1],
                'field': 1,
                'officials': teams[2],
                'scheduled': '10:00',
                'standing': 'Group 1',
            },
            last_gameinfo
        )

        last_gameinfo: Gameinfo = Gameinfo.objects.last()
        assert last_gameinfo.gameday == expected_gameday

        gameresult_home = Gameresult.objects.get(gameinfo=last_gameinfo, isHome=True)
        gameresult_away = Gameresult.objects.get(gameinfo=last_gameinfo, isHome=False)
        assert gameresult_home.team == teams[0]
        assert gameresult_away.team == teams[1]
