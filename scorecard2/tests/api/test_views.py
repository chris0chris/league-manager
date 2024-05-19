from http import HTTPStatus

from django.urls import reverse
from django_webtest import WebTest

from gamedays.models import Gameinfo, GameOfficial
from gamedays.tests.setup_factories.db_setup import DBSetup
from scorecard2.api.urls import API_SCORECARD_GAME_OFFICIALS


class TestRetrieveUpdateOfficials(WebTest):

    def test_create_officials(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        assert len(GameOfficial.objects.all()) == 0
        response = self.app.put_json(reverse(API_SCORECARD_GAME_OFFICIALS, kwargs={'pk': last_game.pk}), [
            {"name": "Saskia", "position": "referee"},
            {"name": "Franz", "position": "side jude"}], headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 2

    def test_officials_will_be_updated(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_game_officials(last_game)
        assert len(GameOfficial.objects.all()) == 5
        response = self.app.put_json(reverse(API_SCORECARD_GAME_OFFICIALS, kwargs={'pk': last_game.pk}), [
            {"name": "Saskia", "position": "Referee"},
            {"name": "Franz", "position": "Side Judge"}], headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 5

    def test_officials_get(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_game_officials(last_game)
        response = self.app.get(reverse(API_SCORECARD_GAME_OFFICIALS, kwargs={'pk': last_game.pk}))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 5