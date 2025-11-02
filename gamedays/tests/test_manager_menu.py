"""Tests for manager menu items"""
import pytest
from django.contrib.auth.models import User

from gamedays.models import League, Season, Team, LeagueManager, GamedayManager, TeamManager
from gamedays.menu import GamedaysMenuAdmin, GamedaysMenuManager
from gamedays.tests.setup_factories.db_setup import DBSetup


class MockRequest:
    """Mock HTTP request for testing"""
    def __init__(self, user):
        self.user = user


@pytest.mark.django_db
class TestGamedaysMenuAdmin:
    """Tests for GamedaysMenuAdmin"""

    def test_staff_user_sees_menu_items(self):
        """Staff users see all admin menu items"""
        staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )

        menu = GamedaysMenuAdmin()
        request = MockRequest(staff_user)
        items = menu.get_menu_items(request)

        assert len(items) == 3
        item_names = [item.name for item in items]
        assert "Spieltag erstellen" in item_names
        assert "Manager Dashboard" in item_names
        assert "Backend" in item_names

    def test_regular_user_sees_no_items(self):
        """Regular users see no admin menu items"""
        regular_user = User.objects.create_user(
            username='regular', password='test123'
        )

        menu = GamedaysMenuAdmin()
        request = MockRequest(regular_user)
        items = menu.get_menu_items(request)

        assert len(items) == 0

    def test_menu_name(self):
        """Test menu name"""
        assert GamedaysMenuAdmin.get_name() == "Orga"


@pytest.mark.django_db
class TestGamedaysMenuManager:
    """Tests for GamedaysMenuManager"""

    def test_staff_user_sees_no_items(self):
        """Staff users don't see manager menu (they use admin menu)"""
        staff_user = User.objects.create_user(
            username='staff', password='test123', is_staff=True
        )

        menu = GamedaysMenuManager()
        request = MockRequest(staff_user)
        items = menu.get_menu_items(request)

        assert len(items) == 0

    def test_league_manager_sees_dashboard(self):
        """League managers see manager dashboard"""
        user = User.objects.create_user(username='league_mgr', password='test123')
        league = DBSetup().create_league()
        season = Season.objects.create(name='2024')

        LeagueManager.objects.create(
            user=user,
            league=league,
            season=season
        )

        menu = GamedaysMenuManager()
        request = MockRequest(user)
        items = menu.get_menu_items(request)

        assert len(items) == 1
        assert items[0].name == "Manager Dashboard"
        assert items[0].url == "manager-dashboard"

    def test_gameday_manager_sees_dashboard(self):
        """Gameday managers see manager dashboard"""
        user = User.objects.create_user(username='gameday_mgr', password='test123')
        gameday = DBSetup().g62_status_empty()

        GamedayManager.objects.create(
            user=user,
            gameday=gameday
        )

        menu = GamedaysMenuManager()
        request = MockRequest(user)
        items = menu.get_menu_items(request)

        assert len(items) == 1
        assert items[0].name == "Manager Dashboard"

    def test_team_manager_sees_dashboard(self):
        """Team managers see manager dashboard"""
        user = User.objects.create_user(username='team_mgr', password='test123')
        team = Team.objects.create(name='Test Team', description='Test')

        TeamManager.objects.create(
            user=user,
            team=team
        )

        menu = GamedaysMenuManager()
        request = MockRequest(user)
        items = menu.get_menu_items(request)

        assert len(items) == 1
        assert items[0].name == "Manager Dashboard"

    def test_regular_user_sees_no_items(self):
        """Regular users with no permissions see no menu items"""
        user = User.objects.create_user(username='regular', password='test123')

        menu = GamedaysMenuManager()
        request = MockRequest(user)
        items = menu.get_menu_items(request)

        assert len(items) == 0

    def test_menu_name(self):
        """Test menu name"""
        assert GamedaysMenuManager.get_name() == "Manager"


class MockAnonymousUser:
    """Mock anonymous user"""
    is_authenticated = False
    is_staff = False


@pytest.mark.django_db
class TestGamedaysMenuManagerAnonymous:
    """Tests for GamedaysMenuManager with anonymous users"""

    def test_anonymous_user_sees_no_items(self):
        """Anonymous users see no menu items"""
        menu = GamedaysMenuManager()
        request = MockRequest(MockAnonymousUser())
        items = menu.get_menu_items(request)

        assert len(items) == 0
