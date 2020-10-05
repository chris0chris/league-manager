import json
import pathlib
from collections import OrderedDict
from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.api.serializers import GamedaySerializer
from gamedays.models import Gameday, Gameinfo
from gamedays.service.gameday_service import EmptySchedule, EmptyFinalTable, EmptyQualifyTable
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayAPIViews(WebTest):

    def test_gameday_list(self):
        all_gamedays = [DBSetup().create_empty_gameday(), DBSetup().create_empty_gameday(),
                        DBSetup().create_empty_gameday()]
        response = self.app.get(reverse('api-gameday-list'))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == len(all_gamedays)


class TestGameinfoAPIViews(WebTest):

    def test_update_gameinfo(self):
        DBSetup().g62_status_empty()
        gameinfo_pk = 1
        assert Gameinfo.objects.get(id=gameinfo_pk).status == ''
        response = self.app.patch_json(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo_pk}),
                                       {'status': 'gestartet'})
        assert response.status_code == HTTPStatus.OK
        assert Gameinfo.objects.get(id=gameinfo_pk).status == 'gestartet'


class TestGamedayRetrieveUpdate(WebTest):

    def test_api_retrieve_gameday(self):
        gameday = DBSetup().g62_status_empty()
        gameday = Gameday.objects.get(id=gameday.pk)
        response = self.app.get(reverse('api-gameday-retrieve-update', kwargs={'pk': gameday.pk}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == GamedaySerializer(gameday).data


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
