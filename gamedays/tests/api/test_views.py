import json
import pathlib
from http import HTTPStatus

from django.test import override_settings
from django_webtest import WebTest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from gamedays.api.serializers import GamedaySerializer
from gamedays.models import Gameday, Gameinfo

TESTDATA = 'testdata.json'


@override_settings(SUSPEND_SIGNALS=True)
class TestGamedayAPIViews(WebTest):
    fixtures = [TESTDATA]

    def test_gameday_list(self):
        all_gamedays = Gameday.objects.all()
        client = APIClient()
        response = self.app.get(reverse('api-gameday-list'))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == len(all_gamedays)


@override_settings(SUSPEND_SIGNALS=True)
class TestGameinfoAPIViews(WebTest):
    fixtures = [TESTDATA]

    def test_update_gameinfo(self):
        gameinfo_pk = 52
        assert Gameinfo.objects.get(id=gameinfo_pk).status == 'beendet'
        response = self.app.patch_json(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo_pk}),
                                       {'status': 'gestartet'})
        assert response.status_code == HTTPStatus.OK
        assert Gameinfo.objects.get(id=52).status == 'gestartet'


@override_settings(SUSPEND_SIGNALS=True)
class TestGamedayRetrieveUpdate(WebTest):
    fixtures = [TESTDATA]

    def test_retrieve_gameday(self):
        gameday_id = 1
        gameday = Gameday.objects.get(id=gameday_id)
        response = self.app.get(reverse('api-gameday-retrieve-update', kwargs={'pk': gameday_id}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == GamedaySerializer(gameday).data


@override_settings(SUSPEND_SIGNALS=True)
class TestGamedaySchedule(WebTest):
    fixtures = [TESTDATA]

    def test_get_schedule(self):
        gameday_id = 1
        with open(pathlib.Path(__file__).parent / 'testdata/schedule_gameday_1.json') as f:
            expected_schedule = json.load(f)
        response = self.app.get(reverse('api-gameday-schedule', kwargs={'pk': gameday_id}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == expected_schedule


@override_settings(SUSPEND_SIGNALS=True)
class TestCreateGameday(WebTest):
    fixtures = [TESTDATA]

    def test_create_gameday(self):
        all_gamedays = len(Gameday.objects.all())
        response = self.app.post_json(reverse('api-gameday-create'), {
            "name": "Test Gameday",
            "date": "2010-10-22",
            "start": "10:00"
        })
        assert response.status_code == HTTPStatus.CREATED
        assert response.json == GamedaySerializer(Gameday.objects.all().last()).data
