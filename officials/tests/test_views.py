from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.contrib.messages import get_messages
from django.test import TestCase, Client
from django_webtest import WebTest, DjangoWebtestResponse
from rest_framework.reverse import reverse

from gamedays.models import Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.models import Official, OfficialGamedaySignup
from officials.service.moodle.moodle_api import MoodleApiException
from officials.service.moodle.moodle_service import MoodleService
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.urls import OFFICIALS_LIST_FOR_TEAM, OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE, \
    OFFICIALS_LICENSE_CHECK, OFFICIALS_MOODLE_LOGIN, OFFICIALS_SIGN_UP_LIST, OFFICIALS_SIGN_UP_FOR_GAMEDAY
from officials.views import MOODLE_LOGGED_IN_USER, OfficialSignUpView


class TestOfficialListView(WebTest):
    def test_officials_names_are_obfuscated_for_anonymous_user(self):
        team = DbSetupOfficials().create_officials_full_setup()
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        officials_list = response.context['officials_list']
        first_official: dict = officials_list[0]
        assert first_official.get('first_name') == 'F****'
        assert first_official.get('last_name') == 'F****'

    def test_officials_access_forbidden_for_authenticated_user_but_not_team_member(self):
        user = DBSetup().create_new_user('some user')
        self.app.set_user(user)
        team = DbSetupOfficials().create_officials_full_setup()
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
        officials_list = response.context['officials_list']
        first_official: dict = officials_list[1]
        assert first_official.get('first_name') == 'J****'
        assert first_official.get('last_name') == 'J****'

    def test_access_to_team_officials_only_for_team_member(self):
        team = DbSetupOfficials().create_officials_full_setup()
        self.app.set_user(User.objects.first())
        response = self.app.get(reverse(OFFICIALS_LIST_FOR_TEAM, kwargs={'pk': team.pk}))
        officials_list = response.context['officials_list']
        all_officials = Official.objects.all()
        assert len(officials_list) == len(all_officials)


class TestAddInternalGameOfficialUpdateView(WebTest):
    def test_gameinfo_id_not_a_int(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        form = response.forms[1]
        form['entries'] = 'str, 2, position'
        response = form.submit()
        self.assertFormError(response.context['form'], 'entries', ['gameinfo_id muss eine Zahl sein!'])

    def test_gameinfo_id_not_found(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        form = response.forms[1]
        form['entries'] = '0, 0, Referee'
        response = form.submit()
        self.assertFormError(response.context['form'], 'entries', ['gameinfo_id nicht gefunden!'])

    def test_official_id_not_found(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        form = response.forms[1]
        form['entries'] = f'{first_game.pk}, 9999, Field Judge'
        response = form.submit()
        self.assertFormError(response.context['form'], 'entries', ['official_id nicht gefunden!'])

    def test_position_illegal_entry(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        DbSetupOfficials().create_officials_and_team()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        form = response.forms[1]
        form['entries'] = '1, 2, down judge'
        response = form.submit()
        self.assertFormError(response.context['form'], 'entries', ['Position muss genau einen der Werte haben: '
                                                           'Referee, Down Judge, Field Judge, Side Judge!'])

    def test_game_official_entry_successfull(self):
        user = DBSetup().create_new_user('some user', is_staff=True)
        self.app.set_user(user)
        DBSetup().g62_status_empty()
        DbSetupOfficials().create_officials_and_team()
        first_game = Gameinfo.objects.first()
        first_official = Official.objects.first()
        response: DjangoWebtestResponse = self.app.get(reverse(OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE))
        form = response.forms[1]
        form['entries'] = f'{first_game.pk}, {first_official.pk + 1}, Side Judge'
        response = form.submit()
        assert ' - Julia Jegura als Side Judge' in \
               response.html.find_all("div", {"class": "alert-success"})[0].text


class TestGameCountOfficials(WebTest):
    @patch.object(MoodleService, 'get_all_users_for_course')
    def test_all_entries_will_be_checked(self, moodle_service_mock: MagicMock):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        DbSetupOfficials().create_officials_full_setup()
        all_official_ids = []
        current_official: Official
        for current_official in Official.objects.all():
            all_official_ids += [int(current_official.external_id)]
        moodle_service_mock.return_value = all_official_ids
        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_LICENSE_CHECK, kwargs={'course_id': 7})
        )
        assert len(response.context['officials_list']) == Official.objects.all().count()


class TestMoodleLogin(WebTest):
    @patch.object(MoodleService, 'login')
    def test_login_fails_with_form_error(self, moodle_login_mock: MagicMock):
        error_text = 'Invalid login'
        moodle_login_mock.side_effect = MoodleApiException(error_text)

        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_MOODLE_LOGIN)
        )
        response.form['username'] = 'invalid username'
        response.form['password'] = 'secret password'
        response = response.form.submit()
        self.assertFormError(response.context['form'], None, [error_text])

    @patch.object(MoodleService, 'login')
    def test_login_is_successful(self, moodle_login_mock: MagicMock):
        official_id = 7
        moodle_login_mock.return_value = official_id

        response: DjangoWebtestResponse = self.app.get(
            reverse(OFFICIALS_MOODLE_LOGIN)
        )
        response.form['username'] = 'valid username'
        response.form['password'] = 'secret password'
        response = response.form.submit()
        assert response.client.session.get(MOODLE_LOGGED_IN_USER) == official_id
        assert response.url == reverse(OFFICIALS_SIGN_UP_LIST)


class TestOfficialSignUpListView(WebTest):
    def test_redirect_to_login(self):
        response: DjangoWebtestResponse = self.client.get(
            reverse(OFFICIALS_SIGN_UP_LIST)
        )
        assert response.url == reverse(OFFICIALS_MOODLE_LOGIN)


class TestOfficialSignUpView(TestCase):
    def test_official_id_not_found_in_session(self):
        response = self.client.get(reverse(OFFICIALS_SIGN_UP_FOR_GAMEDAY, args=[5]))
        messages = list(get_messages(response.wsgi_request))
        assert response.url == reverse(OFFICIALS_MOODLE_LOGIN)
        assert messages[0].message == 'Die Session der Moodle-Anmeldung ist ausgelaufen. Bitte erneut anmelden.'

    def test_user_is_already_signed_up_for_gameday(self):
        DbSetupOfficials().create_officials_and_team()
        gameday = DBSetup().create_empty_gameday()
        official = Official.objects.first()
        OfficialGamedaySignup.objects.create(official=official, gameday=gameday)
        self.client = Client()
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = official.pk
        session.save()

        response = self.client.get(reverse(OFFICIALS_SIGN_UP_FOR_GAMEDAY, args=[gameday.pk]))
        messages = list(get_messages(response.wsgi_request))
        assert response.url == reverse(OFFICIALS_SIGN_UP_LIST)
        assert messages[0].message == 'Du bist bereits für den Spieltag gemeldet: Test Spieltag'
