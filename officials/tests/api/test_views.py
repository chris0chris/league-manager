from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse

from officials.api.serializers import OfficialSerializer
from officials.api.urls import API_OFFICIALS_FOR_TEAM
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from teammanager.models import Team


class TestOfficialApiView(WebTest):
    def test_get_officials_for_team(self):
        team: Team = DbSetupOfficials().create_officials_and_team();
        # last_game = Gameinfo.objects.last()
        # assert len(GameOfficial.objects.all()) == 0
        official = Official.objects.first();
        response = self.app.get(reverse(API_OFFICIALS_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2
        assert response.json[0] == OfficialSerializer(official).data
