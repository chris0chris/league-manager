"""Tests for ManagerPermissionHelper"""
import pytest
from django.contrib.auth.models import User

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
from league_manager.utils.manager_permissions import ManagerPermissionHelper


@pytest.mark.django_db
class TestIsLeagueManager:
    """Tests for is_league_manager()"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.manager = User.objects.create_user(
            username='manager', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.league = DBSetup().create_league()
        self.season1 = Season.objects.create(name='2024')
        self.season2 = Season.objects.create(name='2025')

        # Manager for league + season1
        LeagueManager.objects.create(
            user=self.manager,
            league=self.league,
            season=self.season1
        )

    def test_staff_user_is_always_league_manager(self):
        """Staff users are always league managers"""
        assert ManagerPermissionHelper.is_league_manager(
            self.staff_user, self.league
        ) is True

    def test_league_manager_with_matching_season(self):
        """League manager with matching season"""
        assert ManagerPermissionHelper.is_league_manager(
            self.manager, self.league, self.season1
        ) is True

    def test_league_manager_without_season_check(self):
        """League manager without season check"""
        assert ManagerPermissionHelper.is_league_manager(
            self.manager, self.league
        ) is True

    def test_league_manager_with_different_season(self):
        """League manager with different season should not match"""
        assert ManagerPermissionHelper.is_league_manager(
            self.manager, self.league, self.season2
        ) is False

    def test_league_manager_with_null_season(self):
        """League manager with NULL season (all seasons)"""
        LeagueManager.objects.create(
            user=self.regular_user,
            league=self.league,
            season=None  # All seasons
        )
        assert ManagerPermissionHelper.is_league_manager(
            self.regular_user, self.league, self.season2
        ) is True

    def test_regular_user_is_not_league_manager(self):
        """Regular users are not league managers"""
        assert ManagerPermissionHelper.is_league_manager(
            self.regular_user, self.league
        ) is False


@pytest.mark.django_db
class TestIsGamedayManager:
    """Tests for is_gameday_manager()"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.league_manager = User.objects.create_user(
            username='league_mgr', password='test123'
        )
        self.gameday_manager = User.objects.create_user(
            username='gameday_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.gameday = DBSetup().g62_status_empty()

        # League manager can manage all gamedays in league
        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.gameday.league,
            season=self.gameday.season
        )

        # Direct gameday manager
        GamedayManager.objects.create(
            user=self.gameday_manager,
            gameday=self.gameday
        )

    def test_staff_user_is_always_gameday_manager(self):
        """Staff users are always gameday managers"""
        assert ManagerPermissionHelper.is_gameday_manager(
            self.staff_user, self.gameday
        ) is True

    def test_league_manager_can_manage_gameday(self):
        """League managers can manage gamedays in their league"""
        assert ManagerPermissionHelper.is_gameday_manager(
            self.league_manager, self.gameday
        ) is True

    def test_direct_gameday_manager(self):
        """Direct gameday manager assignment"""
        assert ManagerPermissionHelper.is_gameday_manager(
            self.gameday_manager, self.gameday
        ) is True

    def test_regular_user_is_not_gameday_manager(self):
        """Regular users are not gameday managers"""
        assert ManagerPermissionHelper.is_gameday_manager(
            self.regular_user, self.gameday
        ) is False


@pytest.mark.django_db
class TestIsTeamManager:
    """Tests for is_team_manager()"""

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
            team=self.team
        )

    def test_staff_user_is_always_team_manager(self):
        """Staff users are always team managers"""
        assert ManagerPermissionHelper.is_team_manager(
            self.staff_user, self.team
        ) is True

    def test_team_manager(self):
        """Team manager assignment"""
        assert ManagerPermissionHelper.is_team_manager(
            self.team_manager, self.team
        ) is True

    def test_regular_user_is_not_team_manager(self):
        """Regular users are not team managers"""
        assert ManagerPermissionHelper.is_team_manager(
            self.regular_user, self.team
        ) is False


@pytest.mark.django_db
class TestGetManagedLeagues:
    """Tests for get_managed_leagues()"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.manager = User.objects.create_user(
            username='manager', password='test123'
        )

        self.league1 = DBSetup().create_league()
        self.league2 = League.objects.create(name='League 2', description='Test')
        self.season = Season.objects.create(name='2024')

        LeagueManager.objects.create(
            user=self.manager,
            league=self.league1,
            season=self.season
        )

    def test_staff_user_gets_all_leagues(self):
        """Staff users get all leagues"""
        leagues = ManagerPermissionHelper.get_managed_leagues(self.staff_user)
        assert leagues.count() >= 2

    def test_manager_gets_their_leagues(self):
        """Managers get only their assigned leagues"""
        leagues = ManagerPermissionHelper.get_managed_leagues(self.manager)
        assert leagues.count() == 1
        assert self.league1 in leagues

    def test_filtered_by_season(self):
        """Filter leagues by season"""
        other_season = Season.objects.create(name='2025')
        leagues = ManagerPermissionHelper.get_managed_leagues(
            self.manager, season=other_season
        )
        assert leagues.count() == 0


@pytest.mark.django_db
class TestGetManagedGamedays:
    """Tests for get_managed_gamedays()"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.league_manager = User.objects.create_user(
            username='league_mgr', password='test123'
        )
        self.gameday_manager = User.objects.create_user(
            username='gameday_mgr', password='test123'
        )

        self.gameday1 = DBSetup().g62_status_empty()
        self.gameday2 = DBSetup().create_empty_gameday()

        # League manager for gameday1's league
        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.gameday1.league,
            season=self.gameday1.season
        )

        # Direct gameday manager for gameday2
        GamedayManager.objects.create(
            user=self.gameday_manager,
            gameday=self.gameday2
        )

    def test_staff_user_gets_all_gamedays(self):
        """Staff users get all gamedays"""
        gamedays = ManagerPermissionHelper.get_managed_gamedays(self.staff_user)
        assert gamedays.count() >= 2

    def test_league_manager_gets_league_gamedays(self):
        """League managers get all gamedays in their league"""
        gamedays = ManagerPermissionHelper.get_managed_gamedays(self.league_manager)
        assert self.gameday1 in gamedays

    def test_gameday_manager_gets_assigned_gamedays(self):
        """Gameday managers get their assigned gamedays"""
        gamedays = ManagerPermissionHelper.get_managed_gamedays(self.gameday_manager)
        assert self.gameday2 in gamedays


@pytest.mark.django_db
class TestGetManagedTeams:
    """Tests for get_managed_teams()"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.team_manager = User.objects.create_user(
            username='team_mgr', password='test123'
        )

        self.team1 = Team.objects.create(name='Team 1', description='Test')
        self.team2 = Team.objects.create(name='Team 2', description='Test')

        TeamManager.objects.create(
            user=self.team_manager,
            team=self.team1
        )

    def test_staff_user_gets_all_teams(self):
        """Staff users get all teams"""
        teams = ManagerPermissionHelper.get_managed_teams(self.staff_user)
        assert teams.count() >= 2

    def test_team_manager_gets_their_teams(self):
        """Team managers get only their assigned teams"""
        teams = ManagerPermissionHelper.get_managed_teams(self.team_manager)
        assert teams.count() == 1
        assert self.team1 in teams


@pytest.mark.django_db
class TestCanAssignTeamManager:
    """Tests for can_assign_team_manager()"""

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

        self.league = DBSetup().create_league()
        self.season = Season.objects.create(name='2024')
        self.team = Team.objects.create(name='Test Team', description='Test')

        # Link team to league
        SeasonLeagueTeam.objects.create(
            season=self.season,
            league=self.league,
            team=self.team
        )

        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.league,
            season=self.season
        )

    def test_staff_user_can_assign(self):
        """Staff users can assign team managers"""
        assert ManagerPermissionHelper.can_assign_team_manager(
            self.staff_user, self.team
        ) is True

    def test_league_manager_can_assign_in_their_league(self):
        """League managers can assign team managers in their league"""
        assert ManagerPermissionHelper.can_assign_team_manager(
            self.league_manager, self.team
        ) is True

    def test_regular_user_cannot_assign(self):
        """Regular users cannot assign team managers"""
        assert ManagerPermissionHelper.can_assign_team_manager(
            self.regular_user, self.team
        ) is False


@pytest.mark.django_db
class TestGetGamedayManagerPermissions:
    """Tests for get_gameday_manager_permissions()"""

    def setup_method(self):
        self.staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )
        self.league_manager = User.objects.create_user(
            username='league_mgr', password='test123'
        )
        self.gameday_manager = User.objects.create_user(
            username='gameday_mgr', password='test123'
        )
        self.regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        self.gameday = DBSetup().g62_status_empty()

        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.gameday.league,
            season=self.gameday.season
        )

        GamedayManager.objects.create(
            user=self.gameday_manager,
            gameday=self.gameday,
            can_edit_details=True,
            can_assign_officials=False,
            can_manage_scores=True
        )

    def test_staff_user_gets_full_permissions(self):
        """Staff users get all permissions"""
        perms = ManagerPermissionHelper.get_gameday_manager_permissions(
            self.staff_user, self.gameday
        )
        assert perms['can_edit_details'] is True
        assert perms['can_assign_officials'] is True
        assert perms['can_manage_scores'] is True

    def test_league_manager_gets_full_permissions(self):
        """League managers get full permissions"""
        perms = ManagerPermissionHelper.get_gameday_manager_permissions(
            self.league_manager, self.gameday
        )
        assert perms['can_edit_details'] is True
        assert perms['can_assign_officials'] is True
        assert perms['can_manage_scores'] is True

    def test_gameday_manager_gets_specific_permissions(self):
        """Gameday managers get their specific permissions"""
        perms = ManagerPermissionHelper.get_gameday_manager_permissions(
            self.gameday_manager, self.gameday
        )
        assert perms['can_edit_details'] is True
        assert perms['can_assign_officials'] is False
        assert perms['can_manage_scores'] is True

    def test_regular_user_gets_none(self):
        """Regular users get None"""
        perms = ManagerPermissionHelper.get_gameday_manager_permissions(
            self.regular_user, self.gameday
        )
        assert perms is None


@pytest.mark.django_db
class TestGetTeamManagerPermissions:
    """Tests for get_team_manager_permissions()"""

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
        perms = ManagerPermissionHelper.get_team_manager_permissions(
            self.staff_user, self.team
        )
        assert perms['can_edit_roster'] is True
        assert perms['can_submit_passcheck'] is True

    def test_team_manager_gets_specific_permissions(self):
        """Team managers get their specific permissions"""
        perms = ManagerPermissionHelper.get_team_manager_permissions(
            self.team_manager, self.team
        )
        assert perms['can_edit_roster'] is True
        assert perms['can_submit_passcheck'] is False

    def test_regular_user_gets_none(self):
        """Regular users get None"""
        perms = ManagerPermissionHelper.get_team_manager_permissions(
            self.regular_user, self.team
        )
        assert perms is None
