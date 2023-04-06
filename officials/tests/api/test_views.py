from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.models import Team
from officials.api.serializers import OfficialSerializer
from officials.api.urls import API_OFFICIALS_FOR_TEAM, API_OFFICIALS_SEARCH_BY_NAME
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestOfficialsTeamListAPIView(WebTest):
    def test_get_officials_for_team(self):
        team: Team = DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        response = self.app.get(reverse(API_OFFICIALS_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2
        expected_result = OfficialSerializer(instance=official).data
        actual_result = response.json[0]
        assert actual_result['valid_until'] == str(expected_result['valid_until'])
        del actual_result['valid_until']
        del expected_result['valid_until']
        assert actual_result == expected_result

    def test_get_empty_officials_for_non_existent_team(self):
        DbSetupOfficials().create_officials_and_team()
        Official.objects.first()
        response = self.app.get(reverse(API_OFFICIALS_FOR_TEAM, kwargs={'pk': 999}))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 0


class TestOfficialsSearchName(WebTest):
    def test_search_for_empty_name(self):
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME), expect_errors=True)
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_search_for_only_one_name_part(self):
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME), 'name=onlyOnePartOfName', expect_errors=True)
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_search_for_name(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME), 'name=fra%20fed')
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 1
        expected_result = OfficialSerializer(instance=official).data
        actual_result = response.json[0]
        assert actual_result['valid_until'] == str(expected_result['valid_until'])
        del actual_result['valid_until']
        del expected_result['valid_until']
        assert actual_result == expected_result

    def test_search_finds_multiple_matches(self):
        DbSetupOfficials().create_officials_and_team()
        DbSetupOfficials().create_officials_and_team()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME), 'name=FRA%20FED')
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2

    def test_search_no_official_found(self):
        DbSetupOfficials().create_officials_and_team()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME), 'name=nonExist%20Official', expect_errors=True)
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_search_first_name_is_too_short(self):
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME), 'name=to%20oShortFirstName', expect_errors=True)
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert response.json[0] == 'Vorname muss mindestens 3 Zeichen haben'
