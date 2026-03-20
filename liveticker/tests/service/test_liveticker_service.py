from django.test import TestCase

from gamedays.models import League, Gameinfo, Gameresult
from gamedays.tests.setup_factories.db_setup import DBSetup
from liveticker.service.liveticker_service import LivetickerService


class TestLivetickerService(TestCase):
    def test_no_liveticker_available(self):
        DBSetup().create_empty_gameday()
        ls = LivetickerService([], [], [])
        assert ls.get_liveticker_as_json() == []

    def test_get_livetickers_for_league(self):
        gameday = DBSetup().g62_status_empty()
        league = League(name="specific-league")
        league.save()
        gameday.league = league
        gameday.save()
        ls = LivetickerService(["specific-league"], [], [])
        all_livetickers = ls.get_liveticker_as_json()
        assert len(all_livetickers) == 2

        ls = LivetickerService(["not-available-league"], [], [])
        all_livetickers = ls.get_liveticker_as_json()
        assert all_livetickers == []

    def test_get_all_livetickers_with_games_already_playing(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        Gameinfo.objects.filter(pk=first_game.pk + 1).update(status="1. Halbzeit")
        Gameinfo.objects.filter(pk=first_game.pk + 2).update(status="2. Halbzeit")
        ls = LivetickerService([], [], [])
        all_livetickers = ls.get_liveticker_as_json()
        assert len(all_livetickers) == 4

    def test_get_all_livetickers_for_specific_gameday(self):
        gameday = DBSetup().g62_status_empty()
        DBSetup().g62_status_empty()
        ls = LivetickerService([], [], [])
        all_livetickers = ls.get_liveticker_as_json()
        assert len(all_livetickers) == 4
        ls = LivetickerService([], [], [gameday.pk])
        specific_liveticker = ls.get_liveticker_as_json()
        assert len(specific_liveticker) == 2

    def test_get_livetickers_for_last_done_and_coming_up_games(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        # set first game of group 1
        Gameinfo.objects.filter(pk=first_game.pk).update(
            gameStarted="10:00", gameFinished="10:59", status="beendet"
        )
        # set first game of group 2
        Gameinfo.objects.filter(pk=first_game.pk + 3).update(
            gameStarted="10:00", gameFinished="10:59", status="beendet"
        )
        ls = LivetickerService([], [], [])
        all_livetickers = ls.get_liveticker_as_json()
        assert len(all_livetickers) == 4
        assert dict(all_livetickers[0])["status"] == "Geplant"
        assert dict(all_livetickers[2])["status"] == "beendet"

    def test_liveticker_init_correct(self):
        DBSetup().g62_status_empty()
        liveticker_service = LivetickerService([], [], [])
        all_liveticker = liveticker_service.get_liveticker_as_json()
        first_game = Gameinfo.objects.first()
        assert dict(all_liveticker[0]) == {
            "away": {"isInPossession": False, "name": "AAAAAAA2", "score": 2},
            "home": {"isInPossession": True, "name": "AAAAAAA1", "score": 3},
            "gameId": first_game.pk,
            "standing": "Gruppe 1",
            "status": "Geplant",
            "ticks": [],
            "time": "10:00",
        }

    def test_liveticker_get_default_5_ticks(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        home = Gameresult.objects.get(gameinfo=first_game, isHome=True)
        away = Gameresult.objects.get(gameinfo=first_game, isHome=False)
        DBSetup().create_teamlog_home_and_away(
            home=home.team, away=away.team, gameinfo=first_game
        )
        liveticker_service = LivetickerService([], [], [])
        all_livetickers = liveticker_service.get_liveticker_as_json()
        assert len(all_livetickers[0]["ticks"]) == 5

    def test_liveticker_get_all_ticks(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        home = Gameresult.objects.get(gameinfo=first_game, isHome=True)
        away = Gameresult.objects.get(gameinfo=first_game, isHome=False)
        DBSetup().create_teamlog_home_and_away(
            home=home.team, away=away.team, gameinfo=first_game
        )
        liveticker_service = LivetickerService([], [first_game.pk], [])
        all_livetickers = liveticker_service.get_liveticker_as_json()
        assert len(all_livetickers[0]["ticks"]) == 19
