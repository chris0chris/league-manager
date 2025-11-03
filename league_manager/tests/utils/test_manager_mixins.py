"""Tests for manager permission mixins"""
import pytest
from django.contrib.auth.models import User
from django.http import HttpRequest
from django.views.generic import View

from gamedays.models import (
    League,
    Season,
    Gameday,
    Team,
    LeagueManager,
    GamedayManager,
    TeamManager,
)
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_manager.utils.mixins import (
    LeagueManagerRequiredMixin,
    GamedayManagerRequiredMixin,
    TeamManagerRequiredMixin,
)


class MockRequest:
    """Mock HTTP request for testing"""
    def __init__(self, user):
        self.user = user
        self.GET = {}


@pytest.mark.django_db
class TestLeagueManagerRequiredMixin:
    """Tests for LeagueManagerRequiredMixin"""

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

        LeagueManager.objects.create(
            user=self.league_manager,
            league=self.league,
            season=self.season
        )

    def test_staff_user_passes(self):
        """Staff users pass the test"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.staff_user)
        view.kwargs = {'league_id': self.league.pk}

        assert view.test_func() is True

    def test_league_manager_passes(self):
        """League managers pass the test"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.league_manager)
        view.kwargs = {'league_id': self.league.pk}

        assert view.test_func() is True

    def test_regular_user_fails(self):
        """Regular users fail the test"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.regular_user)
        view.kwargs = {'league_id': self.league.pk}

        assert view.test_func() is False

    def test_no_league_id_fails(self):
        """Missing league_id fails"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.league_manager)
        view.kwargs = {}

        assert view.test_func() is False

    def test_invalid_league_id_fails(self):
        """Invalid league_id fails"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.league_manager)
        view.kwargs = {'league_id': 99999}

        assert view.test_func() is False

    def test_get_league_id_from_get_params(self):
        """Can get league_id from GET parameters"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.league_manager)
        view.request.GET = {'league': str(self.league.pk)}
        view.kwargs = {}

        assert view.test_func() is True

    def test_get_season_id_from_kwargs(self):
        """Can get season_id from kwargs"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.league_manager)
        view.kwargs = {'league_id': self.league.pk, 'season_id': self.season.pk}

        assert view.test_func() is True

    def test_invalid_season_id_fails(self):
        """Invalid season_id fails"""
        class TestView(LeagueManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.league_manager)
        view.kwargs = {'league_id': self.league.pk, 'season_id': 99999}

        assert view.test_func() is False


@pytest.mark.django_db
class TestGamedayManagerRequiredMixin:
    """Tests for GamedayManagerRequiredMixin"""

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
            gameday=self.gameday
        )

    def test_staff_user_passes(self):
        """Staff users pass the test"""
        class TestView(GamedayManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.staff_user)
        view.kwargs = {'pk': self.gameday.pk}

        assert view.test_func() is True

    def test_gameday_manager_passes(self):
        """Gameday managers pass the test"""
        class TestView(GamedayManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.gameday_manager)
        view.kwargs = {'pk': self.gameday.pk}

        assert view.test_func() is True

    def test_regular_user_fails(self):
        """Regular users fail the test"""
        class TestView(GamedayManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.regular_user)
        view.kwargs = {'pk': self.gameday.pk}

        assert view.test_func() is False

    def test_no_pk_fails(self):
        """Missing pk fails"""
        class TestView(GamedayManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.gameday_manager)
        view.kwargs = {}

        assert view.test_func() is False

    def test_invalid_gameday_id_fails(self):
        """Invalid gameday_id fails"""
        class TestView(GamedayManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.gameday_manager)
        view.kwargs = {'pk': 99999}

        assert view.test_func() is False


@pytest.mark.django_db
class TestTeamManagerRequiredMixin:
    """Tests for TeamManagerRequiredMixin"""

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

        self.team = Team.objects.create(name='Test Team', description='Test Team Desc')

        TeamManager.objects.create(
            user=self.team_manager,
            team=self.team
        )

    def test_staff_user_passes(self):
        """Staff users pass the test"""
        class TestView(TeamManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.staff_user)
        view.kwargs = {'pk': self.team.pk}

        assert view.test_func() is True

    def test_team_manager_passes(self):
        """Team managers pass the test"""
        class TestView(TeamManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.team_manager)
        view.kwargs = {'pk': self.team.pk}

        assert view.test_func() is True

    def test_regular_user_fails(self):
        """Regular users fail the test"""
        class TestView(TeamManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.regular_user)
        view.kwargs = {'pk': self.team.pk}

        assert view.test_func() is False

    def test_team_id_kwarg_works(self):
        """Works with team_id kwarg"""
        class TestView(TeamManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.team_manager)
        view.kwargs = {'team_id': self.team.pk}

        assert view.test_func() is True

    def test_no_team_id_fails(self):
        """Missing team_id fails"""
        class TestView(TeamManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.team_manager)
        view.kwargs = {}

        assert view.test_func() is False

    def test_invalid_team_id_fails(self):
        """Invalid team_id fails"""
        class TestView(TeamManagerRequiredMixin, View):
            pass

        view = TestView()
        view.request = MockRequest(self.team_manager)
        view.kwargs = {'pk': 99999}

        assert view.test_func() is False
