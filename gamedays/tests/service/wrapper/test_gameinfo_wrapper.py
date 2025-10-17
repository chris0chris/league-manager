import re

from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import GameinfoFactory


class TestGameinfoWrapper(TestCase):
    def test_halftime_value_is_set(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper.from_id(first_game.pk)
        gameinfo_wrapper.set_halftime_to_now()
        first_game = Gameinfo.objects.first()
        assert first_game.status == '2. Halbzeit'
        assert re.match('^(0\d|1\d|2[0-3]):[0-5]\d', str(first_game.gameHalftime))

    def test_gamestarted_value_is_set(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper.from_id(first_game.pk)
        gameinfo_wrapper.set_gamestarted_to_now()
        first_game: Gameinfo = Gameinfo.objects.first()
        assert first_game.status == '1. Halbzeit'
        assert re.match('^(0\d|1\d|2[0-3]):[0-5]\d', str(first_game.gameStarted))

    def test_game_finished_value_is_set(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        gameinfo_wrapper = GameinfoWrapper.from_instance(first_game)
        gameinfo_wrapper.set_game_finished_to_now()
        first_game: Gameinfo = Gameinfo.objects.first()
        assert first_game.status == 'beendet'
        assert re.match('^(0\d|1\d|2[0-3]):[0-5]\d', str(first_game.gameFinished))

    def test_team_in_possesion_is_updated(self):
        DBSetup().g62_status_empty()
        last_game: Gameinfo = Gameinfo.objects.last()
        gameinfo_wrapper = GameinfoWrapper.from_instance(last_game)
        assert last_game.in_possession == 'A1'
        gameinfo_wrapper.update_team_in_possession('a team')
        assert Gameinfo.objects.last().in_possession == 'a team'

    def test_update_gameday(self):
        DBSetup().g62_status_empty()
        expected_gameday = DBSetup().create_empty_gameday()
        last_game: Gameinfo = Gameinfo.objects.last()
        assert last_game.gameday != expected_gameday
        gameinfo_wrapper = GameinfoWrapper.from_instance(last_game)
        gameinfo_wrapper.update_gameday(expected_gameday)
        last_game_updated: Gameinfo = Gameinfo.objects.last()
        assert last_game_updated.gameday == expected_gameday

    def test_delete_by_gameday(self):
        DBSetup().g62_status_empty()
        last_game: Gameinfo = Gameinfo.objects.last()
        assert Gameinfo.objects.all().count() > 0
        GameinfoWrapper.delete_by_gameday(last_game.gameday)
        assert Gameinfo.objects.all().count() == 0

    def test_update_standing_with_group_string(self):
        gameinfo = GameinfoFactory.create()
        assert gameinfo.league_group is None
        assert gameinfo.standing == ''
        gameinfo_wrapper = GameinfoWrapper(gameinfo)
        gameinfo_wrapper.update_standing('Gruppe 1')
        gameinfo.refresh_from_db()
        assert gameinfo.standing == ''
        assert gameinfo.league_group is None

    def test_update_standing_with_not_existent_group_id(self):
        gameinfo = GameinfoFactory.create()
        assert gameinfo.league_group is None
        assert gameinfo.standing == ''
        gameinfo_wrapper = GameinfoWrapper(gameinfo)
        gameinfo_wrapper.update_standing('0')
        gameinfo.refresh_from_db()
        assert gameinfo.standing == ''
        assert gameinfo.league_group is None
