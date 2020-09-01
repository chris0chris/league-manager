from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from gamedays.models import Gameday

TESTDATA = 'testdata.json'


class TestGamedayAPIViews(WebTest):
    fixtures = [TESTDATA]

    def test_gameday_list(self):
        all_gamedays = Gameday.objects.all()
        client = APIClient()
        response = self.app.get(reverse('api-gameday-list'))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == len(all_gamedays)
