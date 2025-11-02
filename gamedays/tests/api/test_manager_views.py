"""Tests for manager API views"""
from http import HTTPStatus

import pytest
from django.contrib.auth.models import User
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.models import (
    League,
    Season,
    Gameday,
    Team,
    SeasonLeagueTeam,
    LeagueManager,
    GamedayManager,
    TeamManager,
)
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestLeagueManagerAPI(WebTest):
    """Tests for LeagueManager API views"""

    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )
        self.league = DBSetup().create_league()
        self.season = Season.objects.create(name='2024')

    def test_list_league_managers_as_staff(self):
        """Staff can list all league managers"""
        LeagueManager.objects.create(
            user=self.regular_user,
            league=self.league,
            season=self.season,
            created_by=self.staff_user
        )

        response = self.app.get(
            reverse('api-league-manager-list-create', kwargs={'league_id': self.league.pk}),
            headers=DBSetup().get_token_header(self.staff_user)
        )

        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 1

    def test_list_league_managers_as_non_staff_forbidden(self):
        """Non-staff users cannot list league managers"""
        response = self.app.get(
            reverse('api-league-manager-list-create', kwargs={'league_id': self.league.pk}),
            headers=DBSetup().get_token_header(self.regular_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_create_league_manager_as_staff(self):
        """Staff can create league manager assignments"""
        response = self.app.post_json(
            reverse('api-league-manager-list-create', kwargs={'league_id': self.league.pk}),
            {
                'user_id': self.regular_user.pk,
                'season_id': self.season.pk,
            },
            headers=DBSetup().get_token_header(self.staff_user)
        )

        assert response.status_code == HTTPStatus.CREATED
        assert LeagueManager.objects.filter(user=self.regular_user, league=self.league).exists()

    def test_create_league_manager_as_non_staff_forbidden(self):
        """Non-staff cannot create league manager assignments"""
        response = self.app.post_json(
            reverse('api-league-manager-list-create', kwargs={'league_id': self.league.pk}),
            {
                'user_id': self.regular_user.pk,
                'season_id': self.season.pk,
            },
            headers=DBSetup().get_token_header(self.regular_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_delete_league_manager_as_staff(self):
        """Staff can delete league manager assignments"""
        lm = LeagueManager.objects.create(
            user=self.regular_user,
            league=self.league,
            season=self.season,
            created_by=self.staff_user
        )

        response = self.app.delete(
            reverse('api-league-manager-delete', kwargs={'pk': lm.pk}),
            headers=DBSetup().get_token_header(self.staff_user)
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not LeagueManager.objects.filter(pk=lm.pk).exists()

    def test_delete_league_manager_not_found(self):
        """Deleting non-existent league manager returns 404"""
        response = self.app.delete(
            reverse('api-league-manager-delete', kwargs={'pk': 99999}),
            headers=DBSetup().get_token_header(self.staff_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.NOT_FOUND


class TestGamedayManagerAPI(WebTest):
    """Tests for GamedayManager API views"""

    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.league_manager = User.objects.create_user(
            username='league_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )
        self.gameday = DBSetup().g62_status_empty()

        # Make league_manager a league manager
        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.gameday.league,
            season=self.gameday.season,
            created_by=self.staff_user
        )

    def test_list_gameday_managers_as_league_manager(self):
        """League managers can list gameday managers"""
        GamedayManager.objects.create(
            user=self.regular_user,
            gameday=self.gameday,
            assigned_by=self.league_manager
        )

        response = self.app.get(
            reverse('api-gameday-manager-list-create', kwargs={'gameday_id': self.gameday.pk}),
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 1

    def test_create_gameday_manager_as_league_manager(self):
        """League managers can create gameday manager assignments"""
        response = self.app.post_json(
            reverse('api-gameday-manager-list-create', kwargs={'gameday_id': self.gameday.pk}),
            {
                'user_id': self.regular_user.pk,
                'can_edit_details': True,
                'can_assign_officials': True,
                'can_manage_scores': False,
            },
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.CREATED
        gm = GamedayManager.objects.get(user=self.regular_user, gameday=self.gameday)
        assert gm.can_edit_details is True
        assert gm.can_assign_officials is True
        assert gm.can_manage_scores is False

    def test_create_gameday_manager_as_regular_user_forbidden(self):
        """Regular users cannot create gameday manager assignments"""
        response = self.app.post_json(
            reverse('api-gameday-manager-list-create', kwargs={'gameday_id': self.gameday.pk}),
            {
                'user_id': self.regular_user.pk,
            },
            headers=DBSetup().get_token_header(self.regular_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_update_gameday_manager_permissions(self):
        """League managers can update gameday manager permissions"""
        gm = GamedayManager.objects.create(
            user=self.regular_user,
            gameday=self.gameday,
            can_edit_details=True,
            can_assign_officials=False,
            can_manage_scores=False,
            assigned_by=self.league_manager
        )

        response = self.app.patch_json(
            reverse('api-gameday-manager-update-delete', kwargs={'pk': gm.pk}),
            {
                'can_assign_officials': True,
                'can_manage_scores': True,
            },
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.OK
        gm.refresh_from_db()
        assert gm.can_assign_officials is True
        assert gm.can_manage_scores is True

    def test_update_gameday_manager_not_found(self):
        """Updating non-existent gameday manager returns 404"""
        response = self.app.patch_json(
            reverse('api-gameday-manager-update-delete', kwargs={'pk': 99999}),
            {'can_edit_details': False},
            headers=DBSetup().get_token_header(self.staff_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_delete_gameday_manager(self):
        """League managers can delete gameday manager assignments"""
        gm = GamedayManager.objects.create(
            user=self.regular_user,
            gameday=self.gameday,
            assigned_by=self.league_manager
        )

        response = self.app.delete(
            reverse('api-gameday-manager-update-delete', kwargs={'pk': gm.pk}),
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not GamedayManager.objects.filter(pk=gm.pk).exists()


class TestTeamManagerAPI(WebTest):
    """Tests for TeamManager API views"""

    def setUp(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.league_manager = User.objects.create_user(
            username='league_mgr', password='test123'
        )
        self.team_manager = User.objects.create_user(
            username='team_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.league = DBSetup().create_league()
        self.season = Season.objects.create(name='2024')
        self.team = Team.objects.create(name='Test Team', description='Test')

        # Link team to league
        SeasonLeagueTeam.objects.create(
            season=self.season,
            league=self.league,
            team=self.team
        )

        # Make league_manager a league manager
        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.league,
            season=self.season,
            created_by=self.staff_user
        )

        # Make team_manager a team manager
        TeamManager.objects.create(
            user=self.team_manager,
            team=self.team,
            assigned_by=self.league_manager
        )

    def test_list_team_managers_as_league_manager(self):
        """League managers can list team managers"""
        response = self.app.get(
            reverse('api-team-manager-list-create', kwargs={'team_id': self.team.pk}),
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 1  # The team_manager created in setUp

    def test_list_team_managers_as_team_manager(self):
        """Team managers can list team managers"""
        response = self.app.get(
            reverse('api-team-manager-list-create', kwargs={'team_id': self.team.pk}),
            headers=DBSetup().get_token_header(self.team_manager)
        )

        assert response.status_code == HTTPStatus.OK

    def test_list_team_managers_as_regular_user_forbidden(self):
        """Regular users cannot list team managers"""
        response = self.app.get(
            reverse('api-team-manager-list-create', kwargs={'team_id': self.team.pk}),
            headers=DBSetup().get_token_header(self.regular_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_list_team_managers_team_not_found(self):
        """Listing team managers for non-existent team returns 404"""
        response = self.app.get(
            reverse('api-team-manager-list-create', kwargs={'team_id': 99999}),
            headers=DBSetup().get_token_header(self.staff_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_create_team_manager_as_league_manager(self):
        """League managers can create team manager assignments"""
        response = self.app.post_json(
            reverse('api-team-manager-list-create', kwargs={'team_id': self.team.pk}),
            {
                'user_id': self.regular_user.pk,
                'can_edit_roster': True,
                'can_submit_passcheck': False,
            },
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.CREATED
        tm = TeamManager.objects.get(user=self.regular_user, team=self.team)
        assert tm.can_edit_roster is True
        assert tm.can_submit_passcheck is False

    def test_create_team_manager_team_not_found(self):
        """Creating team manager for non-existent team returns 404"""
        response = self.app.post_json(
            reverse('api-team-manager-list-create', kwargs={'team_id': 99999}),
            {'user_id': self.regular_user.pk},
            headers=DBSetup().get_token_header(self.staff_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_delete_team_manager(self):
        """League managers can delete team manager assignments"""
        tm = TeamManager.objects.create(
            user=self.regular_user,
            team=self.team,
            assigned_by=self.league_manager
        )

        response = self.app.delete(
            reverse('api-team-manager-delete', kwargs={'pk': tm.pk}),
            headers=DBSetup().get_token_header(self.league_manager)
        )

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert not TeamManager.objects.filter(pk=tm.pk).exists()

    def test_delete_team_manager_not_found(self):
        """Deleting non-existent team manager returns 404"""
        response = self.app.delete(
            reverse('api-team-manager-delete', kwargs={'pk': 99999}),
            headers=DBSetup().get_token_header(self.staff_user),
            expect_errors=True
        )

        assert response.status_code == HTTPStatus.NOT_FOUND


class TestUserManagerPermissionsAPI(WebTest):
    """Tests for user manager permissions API view"""

    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test123')
        self.league = DBSetup().create_league()
        self.season = Season.objects.create(name='2024')
        self.gameday = DBSetup().g62_status_empty()
        self.team = Team.objects.create(name='Test Team', description='Test')

    def test_get_permissions_for_user_with_no_permissions(self):
        """Regular user with no permissions gets empty lists"""
        response = self.app.get(
            reverse('api-user-manager-permissions'),
            headers=DBSetup().get_token_header(self.user)
        )

        assert response.status_code == HTTPStatus.OK
        data = response.json
        assert data['is_staff'] is False
        assert len(data['managed_leagues']) == 0
        assert len(data['managed_gamedays']) == 0
        assert len(data['managed_teams']) == 0

    def test_get_permissions_for_staff_user(self):
        """Staff user gets is_staff flag"""
        staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )

        response = self.app.get(
            reverse('api-user-manager-permissions'),
            headers=DBSetup().get_token_header(staff_user)
        )

        assert response.status_code == HTTPStatus.OK
        data = response.json
        assert data['is_staff'] is True

    def test_get_permissions_for_league_manager(self):
        """League manager sees their league permissions"""
        LeagueManager.objects.create(
            user=self.user,
            league=self.league,
            season=self.season
        )

        response = self.app.get(
            reverse('api-user-manager-permissions'),
            headers=DBSetup().get_token_header(self.user)
        )

        assert response.status_code == HTTPStatus.OK
        data = response.json
        assert len(data['managed_leagues']) == 1
        assert data['managed_leagues'][0]['league_name'] == self.league.name

    def test_get_permissions_for_gameday_manager(self):
        """Gameday manager sees their gameday permissions"""
        GamedayManager.objects.create(
            user=self.user,
            gameday=self.gameday,
            can_edit_details=True,
            can_assign_officials=False,
            can_manage_scores=True
        )

        response = self.app.get(
            reverse('api-user-manager-permissions'),
            headers=DBSetup().get_token_header(self.user)
        )

        assert response.status_code == HTTPStatus.OK
        data = response.json
        assert len(data['managed_gamedays']) == 1
        gd = data['managed_gamedays'][0]
        assert gd['can_edit_details'] is True
        assert gd['can_assign_officials'] is False
        assert gd['can_manage_scores'] is True

    def test_get_permissions_for_team_manager(self):
        """Team manager sees their team permissions"""
        TeamManager.objects.create(
            user=self.user,
            team=self.team,
            can_edit_roster=True,
            can_submit_passcheck=False
        )

        response = self.app.get(
            reverse('api-user-manager-permissions'),
            headers=DBSetup().get_token_header(self.user)
        )

        assert response.status_code == HTTPStatus.OK
        data = response.json
        assert len(data['managed_teams']) == 1
        tm = data['managed_teams'][0]
        assert tm['can_edit_roster'] is True
        assert tm['can_submit_passcheck'] is False
