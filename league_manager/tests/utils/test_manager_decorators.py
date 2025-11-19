"""Tests for manager permission decorators"""
import pytest
from django.contrib.auth.models import User
from rest_framework.exceptions import PermissionDenied

from gamedays.models import League, Season, Gameday, Team, LeagueManager, GamedayManager, TeamManager
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_manager.utils.decorators import (
    league_manager_required,
    gameday_manager_required,
    team_manager_required,
)


class MockRequest:
    """Mock request object for testing decorators"""
    def __init__(self, user):
        self.user = user


class MockView:
    """Mock view for testing method decorators"""
    pass


@pytest.mark.django_db
class TestLeagueManagerRequiredDecorator:
    """Tests for @league_manager_required decorator"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.league_manager = User.objects.create_user(
            username='league_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.league = League.objects.create(name='Test League')
        self.season = Season.objects.create(name='2024')
        self.gameday = DBSetup().g62_status_empty()
        self.gameday.league = self.league
        self.gameday.season = self.season
        self.gameday.save()

        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.league,
            season=self.season
        )

    def test_staff_user_passes(self):
        """Staff users can access league manager decorated views"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('is_manager')

        view = MockView()
        request = MockRequest(self.staff_user)
        result = test_view(view, request, gameday_id=self.gameday.pk)
        assert result is True

    def test_league_manager_with_gameday_id_passes(self):
        """League managers can access views with gameday_id"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('is_manager')

        view = MockView()
        request = MockRequest(self.league_manager)
        result = test_view(view, request, gameday_id=self.gameday.pk)
        assert result is True

    def test_league_manager_with_league_id_passes(self):
        """League managers can access views with league_id"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('is_manager')

        view = MockView()
        request = MockRequest(self.league_manager)
        result = test_view(view, request, league_id=self.league.pk)
        assert result is True

    def test_regular_user_fails(self):
        """Regular users cannot access league manager decorated views"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.regular_user)

        with pytest.raises(PermissionDenied, match="League manager permission required"):
            test_view(view, request, gameday_id=self.gameday.pk)

    def test_gameday_not_found(self):
        """Non-existent gameday raises PermissionDenied"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.league_manager)

        with pytest.raises(PermissionDenied, match="Gameday not found"):
            test_view(view, request, gameday_id=99999)

    def test_league_not_found(self):
        """Non-existent league raises PermissionDenied"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.league_manager)

        with pytest.raises(PermissionDenied, match="League not found"):
            test_view(view, request, league_id=99999)

    def test_no_ids_provided_fails(self):
        """No gameday_id or league_id raises PermissionDenied"""
        @league_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.league_manager)

        with pytest.raises(PermissionDenied, match="League manager permission required"):
            test_view(view, request)


@pytest.mark.django_db
class TestGamedayManagerRequiredDecorator:
    """Tests for @gameday_manager_required decorator"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.gameday_manager = User.objects.create_user(
            username='gameday_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.gameday = DBSetup().g62_status_empty()

        GamedayManager.objects.create(
            user=self.gameday_manager,
            gameday=self.gameday,
            can_edit_details=True,
            can_assign_officials=False,
            can_manage_scores=True
        )

    def test_staff_user_gets_full_permissions(self):
        """Staff users get all permissions"""
        @gameday_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('permissions')

        view = MockView()
        request = MockRequest(self.staff_user)
        permissions = test_view(view, request, gameday_id=self.gameday.pk)

        assert permissions['can_edit_details'] is True
        assert permissions['can_assign_officials'] is True
        assert permissions['can_manage_scores'] is True

    def test_gameday_manager_gets_specific_permissions(self):
        """Gameday managers get their specific permissions"""
        @gameday_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('permissions')

        view = MockView()
        request = MockRequest(self.gameday_manager)
        permissions = test_view(view, request, gameday_id=self.gameday.pk)

        assert permissions['can_edit_details'] is True
        assert permissions['can_assign_officials'] is False
        assert permissions['can_manage_scores'] is True

    def test_regular_user_fails(self):
        """Regular users cannot access gameday manager decorated views"""
        @gameday_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.regular_user)

        with pytest.raises(PermissionDenied, match="Gameday manager permission required"):
            test_view(view, request, gameday_id=self.gameday.pk)

    def test_no_gameday_id_raises_value_error(self):
        """Missing gameday_id raises ValueError"""
        @gameday_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.staff_user)

        with pytest.raises(ValueError, match="gameday_id required"):
            test_view(view, request)

    def test_gameday_not_found(self):
        """Non-existent gameday raises PermissionDenied"""
        @gameday_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.gameday_manager)

        with pytest.raises(PermissionDenied, match="Gameday not found"):
            test_view(view, request, gameday_id=99999)

    def test_uses_pk_kwarg(self):
        """Decorator works with 'pk' kwarg"""
        @gameday_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('is_manager')

        view = MockView()
        request = MockRequest(self.gameday_manager)
        result = test_view(view, request, pk=self.gameday.pk)
        assert result is True


@pytest.mark.django_db
class TestTeamManagerRequiredDecorator:
    """Tests for @team_manager_required decorator"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.team_manager = User.objects.create_user(
            username='team_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.team = Team.objects.create(name='Test Team', description='Test')

        TeamManager.objects.create(
            user=self.team_manager,
            team=self.team,
            can_edit_roster=True,
            can_submit_passcheck=False
        )

    def test_staff_user_gets_full_permissions(self):
        """Staff users get all permissions"""
        @team_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('permissions')

        view = MockView()
        request = MockRequest(self.staff_user)
        permissions = test_view(view, request, team_id=self.team.pk)

        assert permissions['can_edit_roster'] is True
        assert permissions['can_submit_passcheck'] is True

    def test_team_manager_gets_specific_permissions(self):
        """Team managers get their specific permissions"""
        @team_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('permissions')

        view = MockView()
        request = MockRequest(self.team_manager)
        permissions = test_view(view, request, team_id=self.team.pk)

        assert permissions['can_edit_roster'] is True
        assert permissions['can_submit_passcheck'] is False

    def test_regular_user_fails(self):
        """Regular users cannot access team manager decorated views"""
        @team_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.regular_user)

        with pytest.raises(PermissionDenied, match="Team manager permission required"):
            test_view(view, request, team_id=self.team.pk)

    def test_no_team_id_raises_value_error(self):
        """Missing team_id raises ValueError"""
        @team_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.staff_user)

        with pytest.raises(ValueError, match="team_id required"):
            test_view(view, request)

    def test_team_not_found(self):
        """Non-existent team raises PermissionDenied"""
        @team_manager_required
        def test_view(self, request, *args, **kwargs):
            return True

        view = MockView()
        request = MockRequest(self.team_manager)

        with pytest.raises(PermissionDenied, match="Team not found"):
            test_view(view, request, team_id=99999)

    def test_uses_pk_kwarg(self):
        """Decorator works with 'pk' kwarg"""
        @team_manager_required
        def test_view(self, request, *args, **kwargs):
            return kwargs.get('is_manager')

        view = MockView()
        request = MockRequest(self.team_manager)
        result = test_view(view, request, pk=self.team.pk)
        assert result is True
