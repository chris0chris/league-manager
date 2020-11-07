import json
import pathlib
from collections import OrderedDict
from http import HTTPStatus

import pytest
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.api.serializers import GamedaySerializer
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
        assert response.json == GamedaySerializer(gameday).data


class TestGameinfoRetrieveUpdate(WebTest):

    @pytest.mark.xfail
    def test_api_retrieve_gameinfo(self):
        gameday = DBSetup().g62_qualify_finished()
        gameinfo = Gameinfo.objects.filter(gameday=gameday).first()
        response = self.app.get(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo.pk}))
        assert response.status_code == HTTPStatus.OK
        # ToDo @Nik fixme
        assert response.json == {
            'id': 1,
            'gameday_id': 1,
            'scheduled': '10:00:00',
            'field': 1,
            'officials': 'officials',
            'status': 'beendet',
            'pin': '',
            'gameStarted': '',
            'gameHalftime': '',
            'gameFinished': '',
            'stage': 'Vorrunde',
            'standing': 'Gruppe 1',
            'gameinfo_id': 1,
            'id_home': 1,
            'home': 'A1',
            'points_home': 3,
            'points_away': 2,
            'away': 'A2',
            'id_away': 2
        }

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

    @pytest.mark.xfail
    def test_game_setup_create(self):
        # ToDo @Nik
        assert len() == 0
        response = self.app.post_json(reverse('api-gamesetup'),
                                      {"ctResult": "won", "direction": "arrow_forward", "gameinfo": 1,
                                       "fhPossession": "HOME", "id": 1})
        assert response.status_code == HTTPStatus.OK
        assert len() == 1

    @pytest.mark.xfail
    def test_game_setup_update(self):
        # ToDo @Nik
        assert len() == 1
        response = self.app.post_json(reverse('api-gamesetup'),
                                      {"ctResult": "won", "direction": "arrow_forward", "gameinfo": 1,
                                       "fhPossession": "HOME", "id": 1})
        assert response.status_code == HTTPStatus.OK
        assert len() == 1
