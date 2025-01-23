from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.models import Team
from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.api.urls import API_OFFICIALS_FOR_TEAM, API_OFFICIALS_SEARCH_BY_NAME
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestOfficialsTeamListAPIView(WebTest):
    def test_get_officials_for_team(self):
        team: Team = DbSetupOfficials().create_officials_and_team()
        official: Official = Official.objects.first()
        response = self.app.get(reverse(API_OFFICIALS_FOR_TEAM, kwargs={'pk': team.pk}),
                                headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2
        actual_result = response.json[0]
        assert actual_result == {
            'team': official.team.description,
            'id': official.pk,
            'first_name': 'Franzi',
            'last_name': 'Fedora',
        }

    def test_get_empty_officials_for_non_existent_team(self):
        DbSetupOfficials().create_officials_and_team()
        Official.objects.first()
        response = self.app.get(reverse(API_OFFICIALS_FOR_TEAM, kwargs={'pk': 1999}),
                                headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 0


class TestOfficialsSearchName(WebTest):
    def test_search_for_empty_name(self):
        DBSetup().create_new_user()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME, kwargs={'pk': 0}), expect_errors=True,
                                headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_search_for_only_one_name_part(self):
        DBSetup().create_new_user()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME, kwargs={'pk': 0}), 'name=onlyOnePartOfName',
                                expect_errors=True, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_search_for_name(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME, kwargs={'pk': 0}), 'name=fra%20fed',
                                headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 1
        assert response.json[0] == {
            'team': official.team.description,
            'id': official.pk,
            'first_name': 'Franzi',
            'last_name': 'Fedora',
        }

    def test_search_finds_multiple_matches(self):
        DbSetupOfficials().create_officials_and_team()
        official_1: Official = Official.objects.first()
        official_1.external_id = 55
        official_1.save()
        official_2: Official = Official.objects.last()
        official_2.external_id = 77
        official_2.save()
        DbSetupOfficials().create_officials_and_team()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME, kwargs={'pk': 0}), 'name=FRA%20FED',
                                headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 2

    def test_search_no_official_found(self):
        DbSetupOfficials().create_officials_and_team()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME, kwargs={'pk': 0}), 'name=nonExist%20Official',
                                expect_errors=True, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_search_first_name_is_too_short(self):
        DBSetup().create_new_user()
        response = self.app.get(reverse(API_OFFICIALS_SEARCH_BY_NAME, kwargs={'pk': 0}), 'name=to%20oShortFirstName',
                                expect_errors=True, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert response.json[0] == 'Vorname muss mindestens 3 Zeichen haben'
