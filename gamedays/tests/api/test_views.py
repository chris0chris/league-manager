from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from gamedays.models import Gameday, Gameinfo

TESTDATA = 'testdata.json'


class TestGamedayAPIViews(WebTest):
    fixtures = [TESTDATA]

    def test_gameday_list(self):
        all_gamedays = Gameday.objects.all()
        client = APIClient()
        response = self.app.get(reverse('api-gameday-list'))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == len(all_gamedays)


class TestGameinfoAPIViews(WebTest):
    fixtures = [TESTDATA]

    def test_update_gameinfo(self):
        gameinfo_pk = 52
        assert Gameinfo.objects.get(id=gameinfo_pk).status == ''
        response = self.app.patch_json(reverse('api-gameinfo-retrieve-update', kwargs={'pk': gameinfo_pk}),
                                       {'status': 'gestartet'})
        assert response.status_code == HTTPStatus.OK
        assert Gameinfo.objects.get(id=52).status == 'gestartet'
