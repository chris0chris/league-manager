from datetime import datetime

from django.test import TestCase

from gamedays.service.liveticker_service import LivetickerService, Liveticker, Tick
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult, TeamLog, Gameday


class TestLivetickerService(TestCase):
    def test_no_liveticker_available(self):
        gameday = DBSetup().create_empty_gameday()
        ls = LivetickerService(gameday.pk)
        assert ls.get_liveticker() == []

    def test_get_all_livetickers(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(pk__gt=2).update(scheduled='11:00:00')
        ls = LivetickerService(gameday.pk)
        assert len(ls.get_liveticker()) == 2

    def test_get_livetickers_for_last_done_and_coming_up_games(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(pk__lt=3).update(gameStarted='10:00', gameFinished='10:59', status='beendet')
        Gameinfo.objects.filter(pk__gt=2).update(scheduled='11:00:00')
        Gameinfo.objects.filter(pk__gt=4).update(scheduled='12:00:00')
        ls = LivetickerService(gameday.pk)
        assert len(ls.get_liveticker()) == 4
        assert ls.get_liveticker()[0].get_status() == 'Geplant'
        assert ls.get_liveticker()[2].get_status() == 'beendet'

    def test_multiple_gamedays_are_live(self):
        gameday_one = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(gameday=gameday_one, pk__gt=2).update(scheduled='11:00')
        gameday_two = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(gameday=gameday_two, pk__gt=13).update(scheduled='11:00')
        Gameday.objects.all().update(date=datetime.today())
        liveticker_service = LivetickerService()
        assert len(liveticker_service.get_liveticker()) == 4

    def test_only_one_gameday_is_live(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(pk__gt=2).update(scheduled='11:00')
        liveticker_service = LivetickerService(gameday.pk)
        assert len(liveticker_service.get_liveticker()) == 2


class TestLiveticker(TestCase):
    def test_liveticker_get_status_when_gameStarted_empty(self):
        DBSetup().g62_status_empty()
        liveticker = Liveticker(Gameinfo.objects.filter(status='Geplant').last())
        assert liveticker.get_status() == 'Geplant'

    def test_liveticker_get_status_when_gameStarted_is_set(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        last_game.gameStarted = '10:00'
        last_game.status = '1st Half'
        last_game.save()
        liveticker = Liveticker(last_game)
        assert liveticker.get_status() == '1st Half'

    def test_liveticker_get_time_when_gameStarted_empty(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        liveticker = Liveticker(last_game)
        assert liveticker.get_time() == '10:00'

    def test_liveticker_get_time_when_gameStarted_is_set(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        last_game.gameStarted = '12:00'
        last_game.status = '1st Half'
        last_game.save()
        liveticker = Liveticker(Gameinfo.objects.last())
        assert liveticker.get_time() == '12:00'

    def test_liveticker_get_empty_ticks_with_no_team_logs(self):
        DBSetup().g62_status_empty()
        liveticker = Liveticker(Gameinfo.objects.last())
        assert liveticker.get_ticks() == []

    def test_liveticker_get_ticks(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        home = Gameresult.objects.get(gameinfo=last_game, isHome=True)
        away = Gameresult.objects.get(gameinfo=last_game, isHome=False)
        DBSetup().create_teamlog_home_and_away(home=home.team, away=away.team, gameinfo=last_game)
        teamlog_entry: TeamLog = TeamLog.objects.filter(gameinfo=last_game).order_by('-created_time').first()
        # workaround to get test stable due to fast creation of teamlog entries
        if teamlog_entry.team is None or teamlog_entry.event == 'Spielzeit':
            is_home = None
        else:
            is_home = 'home' if teamlog_entry.team.name == home.team.name else 'away'
        liveticker = Liveticker(last_game)
        ticks = liveticker.get_ticks()
        assert len(ticks) == 5
        assert ticks[0] == Tick(teamlog_entry, is_home).as_json()

    def test_game_with_no_team_logs(self):
        DBSetup().g62_status_empty()
        liveticker = Liveticker(Gameinfo.objects.filter(status='Geplant').last())
        assert liveticker.as_json() == {
            "gameId": 6,
            "status": "Geplant",
            "time": "10:00",
            "home": {
                "name": "B3",
                "score": 1,
                "isInPossession": False,
            },
            "away": {
                "name": "B1",
                "score": 3,
                "isInPossession": False,
            },
            "ticks": [],
        }

    def test_is_home_in_possession(self):
        DBSetup().g62_status_empty()
        last_game: Gameinfo = Gameinfo.objects.last()
        last_game.in_possession = 'A1'
        liveticker = Liveticker(last_game)
        assert liveticker.is_home_in_possession()
        assert not liveticker.is_away_in_possession()


class TestTick(TestCase):

    def test_get_time(self):
        DBSetup().create_teamlog_home_and_away()
        teamlog_entry: TeamLog = TeamLog.objects.first()
        expected_time = teamlog_entry.created_time.strftime("%H:%M")
        tick = Tick(teamlog_entry, False)
        assert tick.get_time() == expected_time

    def test_get_text_for_touchdown(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.all()[1], 'home')
        assert tick.get_text() == 'Touchdown: #19'

    def test_get_text_for_pat(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='1-Extra-Punkt').first(), False)
        assert tick.get_text() == '1-Extra-Punkt: #7'

    def test_get_text_for_timeout(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Auszeit').first(), False)
        assert tick.get_text() == 'Auszeit - 00:01'

    def test_get_text_for_game_time(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Spielzeit').first(), False)
        assert tick.get_text() == 'Spielzeit - 12:10'

    def test_get_text_for_incomplete_pat(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='1-Extra-Punkt', player=None).first(), False)
        assert tick.get_text() == '1-Extra-Punkt: -'

    def test_get_text_for_safety(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Safety').first(), False)
        assert tick.get_text() == 'Safety: #7'

    def test_get_text_for_turnover(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Turnover').first(), False)
        assert tick.get_text() == 'Ballabgabe'

    def test_get_as_json(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Touchdown').first(), 'home')
        teamlog_entry: TeamLog = TeamLog.objects.first()
        expected_time = teamlog_entry.created_time.strftime("%H:%M")
        assert tick.as_json() == {
            "text": "Touchdown: #19",
            "team": 'home',
            "time": expected_time,
        }
