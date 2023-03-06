from datetime import datetime
from http import HTTPStatus

from django.contrib.auth.models import User
from django_webtest import WebTest, DjangoWebtestResponse
from rest_framework.reverse import reverse

from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.models import Official, OfficialExternalGames
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.urls import OFFICIALS_LIST_FOR_TEAM, OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE, \
    OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE, OFFICIALS_GAME_COUNT
from teammanager.models import Gameinfo


class TestOfficialListView(WebTest):
    def test_officials_names_are_obfuscated_for_anonymous_user(self):
        team = DbSetupOfficials().create_officials_full_setup()
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        context_items = response.context['object_list']
        first_official: dict = context_items.get('officials_list').get('list')[0]
        assert first_official.get('first_name') == 'F****'
        assert first_official.get('last_name') == 'F****'

    def test_officials_access_forbidden_for_authenticated_user_but_not_team_member(self):
        user = DBSetup().create_new_user('some user')
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(user)
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        context_items = response.context['object_list']
        first_official: dict = context_items.get('officials_list').get('list')[1]
        assert first_official.get('first_name') == 'J****'
        assert first_official.get('last_name') == 'J****'

    def test_access_to_team_officials_only_for_team_member(self):
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(User.objects.first())
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        context_items = response.context['object_list']
        all_officials = Official.objects.all()
        assert len(context_items['officials_list']['list']) == len(all_officials)


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
        response.form['entries'] = '0, 0, Referee'
        response = response.form.submit()
        self.assertFormError(response, 'form', 'entries', ['gameinfo_id nicht gefunden!'])

    def test_official_id_not_found(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = f'{first_game.pk}, 9999, Field Judge'
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
        first_game = Gameinfo.objects.first()
        first_official = Official.objects.first()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        response.form['entries'] = f'{first_game.pk}, {first_official.pk + 1}, Side Judge'
        response = response.form.submit()
        assert ' - Julia Jegura als Side Judge' in \
               response.html.find_all("div", {"class": "alert-success"})[0].text


class TestAddExternalGameOfficialUpdateView(WebTest):

    def test_official_id_not_found(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        response.form['entries'] = f'999, 1, 2022-12-07, Side Judge, AFVBy'
        response = response.form.submit()
        self.assertFormError(response, 'form', 'entries', ['official_id nicht gefunden!'])

    def test_game_official_entry_successfull(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        DbSetupOfficials().create_officials_and_team()
        first_official = Official.objects.first()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE))
        response.form['entries'] = f'{first_official.pk}, 3, 2022-12-07, Side Judge, AFVBy\n' \
                                   f'{first_official.pk}, 1, 2022-12-07, Side Judge, AFVBy'
        response = response.form.submit()
        assert '#Spiele 3: Franzi Fedora' in \
               response.html.find_all("div", {"class": "alert-success"})[0].text
        assert OfficialExternalGames.objects.all().count() == 2


class TestGameCountOfficials(WebTest):
    def test_all_entries_will_be_checked(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        DbSetupOfficials().create_officials_full_setup()
        year = datetime.today().year
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAME_COUNT, kwargs={'year': year})
        )
        assert len(response.context['officials_list']) == Official.objects.all().count()
        assert response.context['season'] == year

    def test_entries_only_for_id_is_checked(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        DbSetupOfficials().create_officials_full_setup()
        official: Official = Official.objects.last()
        official.external_id = 7
        official.save()
        year = datetime.today().year
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_GAME_COUNT, kwargs={'year': year}) + '?externalIds=,,  , 7 '
        )
        assert len(response.context['officials_list']) == 1
        assert response.context['officials_list'][0]['first_name'] == 'Julia'
