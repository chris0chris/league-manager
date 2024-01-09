from datetime import datetime
from http import HTTPStatus

from django.urls import reverse
from django_webtest import WebTest

from gamedays.models import Gameinfo, Gameday
from gamedays.tests.setup_factories.db_setup import DBSetup
from liveticker.api.urls import API_LIVETICKER_ALL


class TestLivetickerAPIView(WebTest):
    def test_no_liveticker_found(self):
        response = self.app.get(reverse(API_LIVETICKER_ALL))
        assert response.json == []

    def test_get_all_livetickers_only_scheduled(self):
        gameday_one = DBSetup().g62_status_empty()
        gameday_two = DBSetup().g62_status_empty()
        first_game_gameday_one = Gameinfo.objects.filter(gameday=gameday_one).first()
        first_game_gameday_two = Gameinfo.objects.filter(gameday=gameday_two).first()
        Gameday.objects.all().update(date=datetime.today())
        response = self.app.get(reverse(API_LIVETICKER_ALL))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 4
        expected_result = {
            'gameId': first_game_gameday_one.pk,
            "status": "Geplant",
            "standing": "Gruppe 1",
            "time": "10:00",
            "home": {
                "name": "AAAAAAA1",
                "score": 3,
                "isInPossession": True,
            }, "away": {
                "name": "AAAAAAA2",
                "score": 2,
                "isInPossession": False,
            },
            "ticks": []
        }
        assert response.json[0] == expected_result
        expected_result['gameId'] = first_game_gameday_two.pk
        assert response.json[2] == expected_result
