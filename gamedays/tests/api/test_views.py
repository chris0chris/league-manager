import json
import pathlib
from collections import OrderedDict
from datetime import datetime
from http import HTTPStatus

import pytest
from django.conf import settings
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer
from gamedays.api.urls import API_GAMEDAY_LIST, API_GAMEDAY_WHISTLEGAMES, API_LIVETICKER_ALL
from gamedays.service.gameday_service import EmptySchedule, EmptyQualifyTable
from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameday, Gameinfo


class TestGamedayAPIViews(WebTest):

    @pytest.mark.xfail
    def test_gameday_list(self):
        for i in range(3):
            DBSetup().create_empty_gameday()
        # YYYY-MM-DD
        today = datetime.today().strftime('%Y-%m-%d')
        Gameday.objects.filter(id__lt=3).update(date=today)
        response = self.app.get(reverse(API_GAMEDAY_LIST))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2


class TestGamedayRetrieveUpdate(WebTest):

    def test_api_retrieve_gameday(self):
        gameday = DBSetup().g62_status_empty()
        response = self.app.get(reverse('api-gameday-retrieve-update', kwargs={'pk': gameday.pk}))
        assert response.status_code == HTTPStatus.OK
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
        assert gameinfo.status == 'Geplant'
        assert gameinfo.gameStarted is None
        assert gameinfo.gameHalftime is None
        assert gameinfo.gameFinished is None
        response = self.app.patch_json(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo_pk}),
                                       {
                                           "status": 'gestartet',
                                           "gameStarted": '20:09',
                                           "gameHalftime": '20:29',
                                           "gameFinished": '09:00',
                                       }, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK

        gameinfo = Gameinfo.objects.get(id=gameinfo_pk)
        assert gameinfo.status == 'gestartet'
        assert str(gameinfo.gameStarted) == '20:09:00'
        assert str(gameinfo.gameHalftime) == '20:29:00'
        assert str(gameinfo.gameFinished) == '09:00:00'


class TestGamedaySchedule(WebTest):

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
        import pandas as pd
        assert response.json == json.loads(pd.DataFrame().to_json(orient='split'))


class TestLivetickerAPIView(WebTest):
    def test_empty_liveticker(self):
        response = self.app.get(reverse(API_LIVETICKER_ALL))
        assert response.json == []

    def test_get_all_livetickers_only_scheduled(self):
        gameday_one = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(gameday=gameday_one, pk__gt=2).update(scheduled='11:00')
        Gameinfo.objects.filter(gameday=gameday_one, pk__lt=3).update(in_possession='A1')
        gameday_two = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(gameday=gameday_two, pk__gt=13).update(scheduled='11:00')
        Gameinfo.objects.filter(gameday=gameday_two, pk__gt=11, pk__lt=14).update(in_possession='A1')
        Gameday.objects.all().update(date=datetime.today())
        response = self.app.get(reverse(API_LIVETICKER_ALL))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 4
        expected_result = {
            "status": "Geplant",
            "time": "10:00",
            "home": {
                "name": "A1",
                "score": 3,
                "isInPossession": True,
            },
            "away": {
                "name": "A2",
                "score": 2,
                "isInPossession": False,
            },
            "ticks": []
        }
        assert response.json[0] == expected_result
        assert response.json[2] == expected_result

    def test_get_livetickers_for_one_gameday(self):
        tmp_settings_debug = settings.DEBUG
        settings.DEBUG = True
        DBSetup().g62_status_empty()
        Gameinfo.objects.filter(pk__gt=2).update(scheduled='11:00')
        response = self.app.get(reverse(API_LIVETICKER_ALL))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2
        assert response.json[0] == {
            "status": "Geplant",
            "time": "10:00",
            "home": {
                "name": "A1",
                "score": 3,
                "isInPossession": True,
            },
            "away": {
                "name": "A2",
                "score": 2,
                "isInPossession": False,
            },
            "ticks": []
        }
        settings.DEBUG = tmp_settings_debug


class TestGamesToWhistleAPIView(WebTest):
    def test_get_games_to_whistle_for_specific_team(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(id=1).update(gameFinished='13:00')
        Gameinfo.objects.filter(id=2).update(officials=2)
        response = self.app.get(reverse(API_GAMEDAY_WHISTLEGAMES, kwargs={'pk': gameday.pk, 'team': 'officials'})
                                , headers=DBSetup().get_token_header())
        assert len(response.json) == 4

    def test_get_all_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()

        Gameinfo.objects.filter(id=1).update(gameFinished='13:00')
        Gameinfo.objects.filter(id=2).update(officials=2)
        response = self.app.get(reverse(API_GAMEDAY_WHISTLEGAMES, kwargs={'pk': gameday.pk, 'team': '*'}))
        assert len(response.json) == 10
