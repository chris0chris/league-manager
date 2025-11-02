"""Tests for manager dashboard view"""
import pytest
from django.contrib.auth.models import User
from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.models import League, Season, Gameday, Team, LeagueManager, GamedayManager, TeamManager
from gamedays.tests.setup_factories.db_setup import DBSetup


@pytest.mark.django_db
class TestManagerDashboardView(WebTest):
    """Tests for ManagerDashboardView"""

    def test_unauthenticated_redirects_to_login(self):
        """Unauthenticated users redirected to login"""
        response = self.app.get(reverse('manager-dashboard'), expect_errors=True)
        assert response.status_code == 302  # Redirect to login

    def test_staff_user_can_access(self):
        """Staff users can access dashboard"""
        staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        response = self.app.get(
            reverse('manager-dashboard'),
            user=staff_user
        )
        assert response.status_code == 200
        assert 'is_staff' in response.context

    def test_league_manager_sees_permissions(self):
        """League managers see their permissions"""
        user = User.objects.create_user(username='league_mgr', password='test123')
        league = DBSetup().create_league()
        season = Season.objects.create(name='2024')

        LeagueManager.objects.create(
            user=user,
            league=league,
            season=season
        )

        response = self.app.get(
            reverse('manager-dashboard'),
            user=user
        )

        assert response.status_code == 200
        assert 'league_permissions' in response.context
        assert len(response.context['league_permissions']) == 1

    def test_gameday_manager_sees_permissions(self):
        """Gameday managers see their permissions"""
        user = User.objects.create_user(username='gameday_mgr', password='test123')
        gameday = DBSetup().g62_status_empty()

        GamedayManager.objects.create(
            user=user,
            gameday=gameday,
            can_edit_details=True
        )

        response = self.app.get(
            reverse('manager-dashboard'),
            user=user
        )

        assert response.status_code == 200
        assert 'gameday_permissions' in response.context
        assert len(response.context['gameday_permissions']) == 1

    def test_team_manager_sees_permissions(self):
        """Team managers see their permissions"""
        user = User.objects.create_user(username='team_mgr', password='test123')
        team = Team.objects.create(name='Test Team', description='Test')

        TeamManager.objects.create(
            user=user,
            team=team,
            can_edit_roster=True
        )

        response = self.app.get(
            reverse('manager-dashboard'),
            user=user
        )

        assert response.status_code == 200
        assert 'team_permissions' in response.context
        assert len(response.context['team_permissions']) == 1

    def test_user_with_no_permissions(self):
        """User with no permissions gets empty context"""
        user = User.objects.create_user(username='regular', password='test123')

        response = self.app.get(
            reverse('manager-dashboard'),
            user=user
        )

        assert response.status_code == 200
        # They can still access the dashboard, just see no permissions
        assert response.context['is_staff'] is False
