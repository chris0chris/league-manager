from http import HTTPStatus

from django.urls import reverse
from django_webtest import WebTest, DjangoWebtestResponse

from gamedays.tests.setup_factories.db_setup import DBSetup
from passcheck.models import Playerlist
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck
from passcheck.urls import PASSCHECK_PLAYER_GAMES_LIST, PASSCHECK_ROSTER_LIST, PASSCHECK_PLAYER_CREATE, \
    PASSCHECK_ROSTER_UPDATE


class TestPasscheckPlayerGamesList(WebTest):
    def test_display_all_participated_games(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        DbSetupPasscheck.create_playerlist_for_team()
        playerlist = Playerlist.objects.first()
        response: DjangoWebtestResponse = self.app.get(
            reverse(PASSCHECK_PLAYER_GAMES_LIST, kwargs={'pk': playerlist.pk}))
        assert response.status_code == HTTPStatus.OK


class TestRosterView(WebTest):
    def test_display_team_roster(self):
        user = DBSetup().create_new_user('some staff user', is_staff=True)
        self.app.set_user(user)
        team, _, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        response: DjangoWebtestResponse = self.app.get(reverse(PASSCHECK_ROSTER_LIST, kwargs={'pk': team.pk}))
        assert response.status_code == HTTPStatus.OK


class TestPlayerlistCreateView(WebTest):

    def test_create_player(self):
        user = DBSetup().create_new_user('CreatorTeam1', is_staff=False)
        team = DBSetup().create_teams('CreatorTeam', 1)[0]
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(PASSCHECK_PLAYER_CREATE))
        assert response.status_code == HTTPStatus.OK
        form = response.forms[1]
        form['first_name'] = 'Created First'
        form['last_name'] = 'Created Last'
        form['pass_number'] = 7777777
        form['year_of_birth'] = 1982
        form['jersey_number'] = 5
        form['sex'] = 1
        response: DjangoWebtestResponse = form.submit().follow()
        assert response.status_code == HTTPStatus.OK
        assert response.request.path == reverse(PASSCHECK_PLAYER_CREATE)
        assert Playerlist.objects.filter(team=team).count() == 1


class TestPlayerlistUpdateView(WebTest):
    def test_update_player(self):
        user = DBSetup().create_new_user('CreatorTeam1', is_staff=False)
        team = DBSetup().create_teams('CreatorTeam', 1)[0]
        DbSetupPasscheck.create_playerlist_for_team(team)
        player = Playerlist.objects.first()
        self.app.set_user(user)
        response: DjangoWebtestResponse = self.app.get(reverse(PASSCHECK_ROSTER_UPDATE, kwargs={'pk': player.pk}))
        assert response.status_code == HTTPStatus.OK
        form = response.forms[1]
        form['first_name'] = 'First Created'
        form['last_name'] = 'Last Created'
        form['year_of_birth'] = 1982
        form['jersey_number'] = 5
        form['sex'] = 1
        response: DjangoWebtestResponse = form.submit().follow()
        assert response.status_code == HTTPStatus.OK
        assert response.request.path == reverse(PASSCHECK_ROSTER_LIST, kwargs={'pk': team.pk})
        first_player = Playerlist.objects.filter(team=team).first()
        assert first_player.player.person.first_name == 'First Created'
        assert first_player.pk == player.pk
