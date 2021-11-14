from http import HTTPStatus

from django.contrib.auth.models import User
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.urls import OFFICIALS_LIST_FOR_TEAM


class TestOfficialListView(WebTest):
    def test_officials_names_are_obfuscated_for_anonymous_user(self):
        team = DbSetupOfficials().create_officials_full_setup()
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        context_items = response.context['object_list']
        first_official: dict = context_items.get('officials_list')[0]
        assert first_official.get('first_name') == 'F****'
        assert first_official.get('last_name') == 'F****'

    def test_officials_access_forbidden_for_authenticated_user_but_not_team_member(self):
        user = DBSetup().create_new_user('some user')
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        context_items = response.context['object_list']
        first_official: dict = context_items.get('officials_list')[1]
        assert first_official.get('first_name') == 'J****'
        assert first_official.get('last_name') == 'J****'

    def test_access_to_team_officials_only_for_team_member(self):
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(User.objects.first())
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        context_items = response.context['object_list']
        all_officials = Official.objects.all()
        assert len(context_items['officials_list']) == len(all_officials)
