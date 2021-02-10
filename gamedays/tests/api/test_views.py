import json
import pathlib
from collections import OrderedDict
from http import HTTPStatus

import pytest
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer
from gamedays.models import Gameday, Gameinfo, GameOfficial
from gamedays.service.gameday_service import EmptySchedule, EmptyFinalTable, EmptyQualifyTable
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayAPIViews(WebTest):

    def test_gameday_list(self):
        all_gamedays = [DBSetup().create_empty_gameday(), DBSetup().create_empty_gameday(),
                        DBSetup().create_empty_gameday()]
        response = self.app.get(reverse('api-gameday-list'))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == len(all_gamedays)


class TestGamedayRetrieveUpdate(WebTest):

    def test_api_retrieve_gameday(self):
        gameday = DBSetup().g62_status_empty()
        response = self.app.get(reverse('api-gameday-retrieve-update', kwargs={'pk': gameday.pk}))
        assert response.status_code == HTTPStatus.OK
        # circleci problem comparing response with serializer when json contains None values
        assert response.json == GamedaySerializer(gameday).data


class TestGameinfoRetrieveUpdate(WebTest):

    def test_api_retrieve_gameinfo(self):
        gameday = DBSetup().g62_qualify_finished()
        gameinfo = Gameinfo.objects.filter(gameday=gameday).first()
        response = self.app.get(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo.pk}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == GameinfoSerializer(gameinfo).data

    def test_update_gameinfo(self):
        DBSetup().g62_status_empty()
        gameinfo_pk = 1
        gameinfo = Gameinfo.objects.get(id=gameinfo_pk)
        assert gameinfo.status == ''
        assert gameinfo.gameStarted is None
        assert gameinfo.gameHalftime is None
        assert gameinfo.gameFinished is None
        assert gameinfo.pin is None
        response = self.app.patch_json(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo_pk}),
                                       {
                                           "status": 'gestartet',
                                           "gameStarted": '20:09',
                                           "gameHalftime": '20:29',
                                           "gameFinished": '09:00',
                                           "pin": 2
                                       })
        assert response.status_code == HTTPStatus.OK

        gameinfo = Gameinfo.objects.get(id=gameinfo_pk)
        assert gameinfo.status == 'gestartet'
        assert str(gameinfo.gameStarted) == '20:09:00'
        assert str(gameinfo.gameHalftime) == '20:29:00'
        assert str(gameinfo.gameFinished) == '09:00:00'
        assert gameinfo.pin == 2


class TestGamedaySchedule(WebTest):

    def test_get_schedule(self):
        gameday = DBSetup().g62_qualify_finished()
        with open(pathlib.Path(__file__).parent / 'testdata/schedule_g62_qualify_finished.json') as f:
            expected_schedule = json.load(f)
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': gameday.pk}) + '?get=schedule')
        assert response.status_code == HTTPStatus.OK
        assert response.json == expected_schedule

    def test_get_empty_schedule(self):
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': 1}) + '?get=schedule')
        assert response.status_code == HTTPStatus.OK
        assert response.json == json.loads(EmptySchedule.to_json(), object_pairs_hook=OrderedDict)

    def test_get_qualify_table(self):
        gameday = DBSetup().g62_qualify_finished()
        with open(pathlib.Path(__file__).parent / 'testdata/qualify_g62_qualify_finished.json') as f:
            expected_qualify = json.load(f)
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': gameday.pk}) + '?get=qualify')
        assert response.status_code == HTTPStatus.OK
        assert response.json == expected_qualify

    def test_get_empty_qualify_table(self):
        gameday = DBSetup().create_empty_gameday()
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': gameday.pk}) + '?get=qualify')
        assert response.status_code == HTTPStatus.OK
        assert response.json == json.loads(EmptyQualifyTable.to_json(), object_pairs_hook=OrderedDict)

    def test_get_final_table(self):
        gameday = DBSetup().g62_finished()
        with open(pathlib.Path(__file__).parent / 'testdata/final_g62_finished.json') as f:
            expected_qualify = json.load(f)
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': gameday.pk}) + '?get=final')
        assert response.status_code == HTTPStatus.OK
        assert response.json == expected_qualify

    def test_get_empty_final_table(self):
        gameday = DBSetup().g62_qualify_finished()
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': gameday.pk}) + '?get=final')
        assert response.status_code == HTTPStatus.OK
        assert response.json == json.loads(EmptyFinalTable.to_json(), object_pairs_hook=OrderedDict)


class TestCreateGameday(WebTest):

    def test_create_gameday(self):
        DBSetup().create_empty_gameday()
        response = self.app.post_json(reverse('api-gameday-create'), {
            "name": "Test Gameday",
            "date": "2010-10-22",
            "start": "10:00"
        })
        assert response.status_code == HTTPStatus.CREATED
        assert response.json == GamedaySerializer(Gameday.objects.all().last()).data


class TestRetrieveUpdateOfficials(WebTest):

    def test_create_officials(self):
        DBSetup().g62_status_empty()
        assert len(GameOfficial.objects.all()) == 0
        response = self.app.post_json(reverse('api-gameofficial-create'), [
            {"name": "Saskia", "position": "referee", "gameinfo": 1},
            {"name": "Franz", "position": "side jude", "gameinfo": 1}])
        assert response.status_code == HTTPStatus.CREATED
        assert len(GameOfficial.objects.all()) == 2

    @pytest.mark.xfail
    def test_update_officials(self):
        DBSetup().g62_status_empty()
        DBSetup().create_officials(Gameinfo.objects.get(id=1))
        assert len(GameOfficial.objects.all()) == 5
        response = self.app.post_json(reverse('api-gameofficial-create'), [
            {"name": "Saskia", "position": "referee", "gameinfo": 1, "id": 1},
            {"name": "Franz", "position": "side jude", "gameinfo": 1, "id": 2}])
        # ToDo @Nik
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 5


class TestGameSetup(WebTest):

    def test_game_setup_create(self):
        gamesetup = {"ctResult": "won", "direction": "arrow_forward", "gameinfo": 1,
                     "fhPossession": "HOME"}
        response = self.app.post_json(reverse('api-gamesetup-create'), gamesetup)
        assert response.status_code == HTTPStatus.CREATED
        assert response.json == gamesetup

    @pytest.mark.xfail
    def test_game_setup_update(self):
        # ToDo @Nik
        assert len() == 1
        response = self.app.post_json(reverse('api-gamesetup'),
                                      {"ctResult": "won", "direction": "arrow_forward", "gameinfo": 1,
                                       "fhPossession": "HOME", "id": 1})
        assert response.status_code == HTTPStatus.OK
        assert len() == 1


class TestGameLog(WebTest):
    def test_game_not_found_exception(self):
        response = self.app.get(reverse('api-gamelog', kwargs={'id': 666}), expect_errors=True)
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_get_team_log(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        response = self.app.get(reverse('api-gamelog', kwargs={'id': gameinfo.pk}))
        assert response.status_code == HTTPStatus.OK
        with open(pathlib.Path(__file__).parent / '../service/testdata/teamlog.json') as f:
            expected_gamelog = json.load(f)
        expected_gamelog['gameId'] = gameinfo.pk
        assert response.json == expected_gamelog

    def test_post_team_log(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        response = self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                                      {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                                       'event': {'td': '19', 'pat1': '7'}})
        assert response.status_code == HTTPStatus.CREATED
        assert response.json == {'away': {'firsthalf': {'entries': [], 'score': 0},
                                          'name': 'A2',
                                          'score': 0,
                                          'secondhalf': {'entries': [], 'score': 0}},
                                 'gameId': 1,
                                 'home': {'firsthalf': {'entries': [{'pat1': 7, 'sequence': 1, 'td': 19}], 'score': 7},
                                          'name': 'A1',
                                          'score': 7,
                                          'secondhalf': {'entries': [], 'score': 0}},
                                 'isFirstHalf': True}
