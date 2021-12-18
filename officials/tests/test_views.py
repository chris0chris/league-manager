from http import HTTPStatus

from django.contrib.auth.models import User
from django_webtest import WebTest, DjangoWebtestResponse
from rest_framework.reverse import reverse

from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.urls import OFFICIALS_LIST_FOR_TEAM, OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE


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


class TestAddInternalGameOfficialUpdateView(WebTest):
    def test_gameinfo_id_not_a_int(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = 'str, 2, position'
        response = response.form.submit()
        self.assertFormError(response, 'form', 'entries', ['gameinfo_id muss eine Zahl sein!'])

    def test_gameinfo_id_not_found(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = '1, 2, Referee'
        response = response.form.submit()
        self.assertFormError(response, 'form', 'entries', ['gameinfo_id nicht gefunden!'])

    def test_official_id_not_found(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = '1, 2, Field Judge'
        response = response.form.submit()
        self.assertFormError(response, 'form', 'entries', ['official_id nicht gefunden!'])

    def test_position_illegal_entry(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        DbSetupOfficials().create_officials_and_team()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = '1, 2, down judge'
        response = response.form.submit()
        self.assertFormError(response, 'form', 'entries', ['Position muss genau einen der Werte haben: '
                                                           'Referee, Down Judge, Field Judge, Side Judge!'])

    def test_game_official_entry_successfull(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        DbSetupOfficials().create_officials_and_team()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = '1, 2, Side Judge'
        response = response.form.submit()
        assert 'ID: 1 -> Spiel 1 - Julia Jegura als Side Judge' in \
               response.html.find_all("div", {"class": "alert-success"})[0].text