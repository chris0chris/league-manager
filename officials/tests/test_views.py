from http import HTTPStatus

from django.contrib.auth.models import User
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.urls import OFFICIALS_LIST_FOR_TEAM


class TestOfficialListView(WebTest):
    def test_officials_access_only_for_authenticated_user(self):
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': 1}))
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index('login/?next=')

    def test_officials_access_forbidden_for_authenticated_user_but_not_team_member(self):
        user = DBSetup().create_new_user('some user')
        teams = DBSetup().create_teams('team', 1)
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': teams[0].pk}), expect_errors=True)
        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_access_to_team_officials_only_for_team_member(self):
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(User.objects.first())
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        context_items = response.context['object_list']
        all_officials = Official.objects.all()
        assert len(context_items['officials_list']) == len(all_officials)
