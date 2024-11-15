from http import HTTPStatus

from django.urls import reverse
from django_webtest import WebTest

from gamedays.tests.setup_factories.db_setup import DBSetup
from passcheck.models import Playerlist
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck
from passcheck.urls import PASSCHECK_PLAYER_GAMES_LIST, PASSCHECK_ROSTER_LIST


class TestGameCountOfficials(WebTest):
    def test_display_all_participated_games(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        DbSetupPasscheck.create_playerlist_for_team()
        playerlist = Playerlist.objects.first()
        response = self.app.get(reverse(PASSCHECK_PLAYER_GAMES_LIST, kwargs={'pk': playerlist.pk}))
        assert response.status_code == HTTPStatus.OK

    def test_display_team_roster(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        team, _, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        response = self.app.get(reverse(PASSCHECK_ROSTER_LIST, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK
