from datetime import datetime

from django.test import TestCase

from gamedays.service.liveticker_service import LivetickerService, Liveticker, Tick
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, Gameresult, TeamLog, Gameday


class TestGameService(TestCase):
    def test_no_liveticker_available(self):
        gameday = DBSetup().create_empty_gameday()
        ls = LivetickerService(gameday.pk)
        assert ls.getLiveticker() == []

    def test_get_all_livetickers(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(pk__gt=2).update(scheduled='11:00:00')
        ls = LivetickerService(gameday.pk)
        assert len(ls.getLiveticker()) == 2

class TestLivetickerService(TestCase):
    def test_multiple_gamedays_are_live(self):
        gameday_one = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(gameday=gameday_one, pk__gt=2).update(scheduled='11:00')
        gameday_two = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(gameday=gameday_two, pk__gt=13).update(scheduled='11:00')
        Gameday.objects.all().update(date=datetime.today())
        liveticker_service = LivetickerService()
        assert len(liveticker_service.getLiveticker()) == 4


    def test_only_one_gameday_is_live(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(pk__gt=2).update(scheduled='11:00')
        liveticker_service = LivetickerService(gameday.pk)
        assert len(liveticker_service.getLiveticker()) == 2

class TestLiveticker(TestCase):
    def test_liveticker_get_status_when_gameStarted_empty(self):
        DBSetup().g62_status_empty()
        liveticker = Liveticker(Gameinfo.objects.last())
        assert liveticker.get_status() == 'Geplant'

    def test_liveticker_get_status_when_gameStarted_is_set(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        lastGame.gameStarted = '10:00'
        lastGame.status = '1st Half'
        lastGame.save()
        liveticker = Liveticker(lastGame)
        assert liveticker.get_status() == '1st Half'

    def test_liveticker_get_time_when_gameStarted_empty(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        liveticker = Liveticker(lastGame)
        assert liveticker.get_time() == '10:00'

    def test_liveticker_get_time_when_gameStarted_is_set(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        lastGame.gameStarted = '12:00'
        lastGame.status = '1st Half'
        lastGame.save()
        liveticker = Liveticker(Gameinfo.objects.last())
        assert liveticker.get_time() == '12:00'

    def test_liveticker_get_empty_ticks_when_no_team_logs(self):
        DBSetup().g62_status_empty()
        liveticker = Liveticker(Gameinfo.objects.last())
        assert liveticker.get_ticks() == []

    def test_liveticker_get_ticks(self):
        DBSetup().g62_status_empty()
        lastGame = Gameinfo.objects.last()
        home = Gameresult.objects.get(gameinfo=lastGame, isHome=True)
        away = Gameresult.objects.get(gameinfo=lastGame, isHome=False)
        DBSetup().create_teamlog_home_and_away(home=home.team, away=away.team, gameinfo=lastGame)
        teamlog_entry: TeamLog = TeamLog.objects.filter(gameinfo=lastGame).order_by('-created_time').first()
        liveticker = Liveticker(lastGame)
        ticks = liveticker.get_ticks()
        assert len(ticks) == 5
        assert ticks[0] == Tick(teamlog_entry, False).as_json()


    def test_game_with_no_team_logs(self):
        DBSetup().g62_status_empty()
        liveticker = Liveticker(Gameinfo.objects.last())
        assert liveticker.as_json() == {
            "status": "Geplant",
            "time": "10:00",
            "home": {
                "name": "A1",
                "score": 0,
            },
            "away": {
                "name": "B1",
                "score": 0,
            },
            "ticks": [],
        }

class TestTick(TestCase):
    # ToDo implement me
    # def test_get_time(self):
    #     DBSetup().create_teamlog_home_and_away()
    #     tick = Tick(TeamLog.objects.last())
    #     assert tick.get_time() ==

    def test_get_time(self):
        DBSetup().create_teamlog_home_and_away()
        teamlog_entry: TeamLog = TeamLog.objects.first()
        expected_time = teamlog_entry.created_time.strftime("%H:%M")
        tick = Tick(teamlog_entry, False)
        assert tick.get_time() == expected_time

    def test_get_text_for_touchdown(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.first(), False)
        assert tick.get_text() == 'Touchdown: #19'

    def test_get_text_for_pat(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='1-Extra-Punkt').first(), False)
        assert tick.get_text() == '1-Extra-Punkt: #7'

    def test_get_text_for_safety(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Safety').first(), False)
        assert tick.get_text() == 'Safety: #7'

    def test_get_text_for_turnover(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Turnover').first(), False)
        assert tick.get_text() == 'Turnover'

    def test_get_as_json(self):
        DBSetup().create_teamlog_home_and_away()
        tick = Tick(TeamLog.objects.filter(event='Touchdown').first(), False)
        teamlog_entry: TeamLog = TeamLog.objects.first()
        expected_time = teamlog_entry.created_time.strftime("%H:%M")
        assert tick.as_json() == {
            "text":  "Touchdown: #19",
            "isHome": False,
            "time": expected_time,
        }

