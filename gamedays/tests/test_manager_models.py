"""Tests for manager models"""
import pytest
from django.contrib.auth.models import User

from gamedays.models import League, Season, Gameday, Team, LeagueManager, GamedayManager, TeamManager
from gamedays.tests.setup_factories.db_setup import DBSetup


@pytest.mark.django_db
class TestLeagueManagerModel:
    """Tests for LeagueManager model"""

    def test_str_representation_with_season(self):
        """Test __str__ with season"""
        user = User.objects.create_user(username='test', password='test123')
        league = DBSetup().create_league()
        season = Season.objects.create(name='2024')

        lm = LeagueManager.objects.create(
            user=user,
            league=league,
            season=season
        )

        assert str(lm) == f'test -> {league.name} (2024)'

    def test_str_representation_without_season(self):
        """Test __str__ without season (all seasons)"""
        user = User.objects.create_user(username='test', password='test123')
        league = DBSetup().create_league()

        lm = LeagueManager.objects.create(
            user=user,
            league=league,
            season=None
        )

        assert str(lm) == f'test -> {league.name} (All Seasons)'

    def test_unique_together_constraint(self):
        """Test unique_together constraint"""
        user = User.objects.create_user(username='test', password='test123')
        league = DBSetup().create_league()
        season = Season.objects.create(name='2024')

        LeagueManager.objects.create(
            user=user,
            league=league,
            season=season
        )

        # Try to create duplicate
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            LeagueManager.objects.create(
                user=user,
                league=league,
                season=season
            )


@pytest.mark.django_db
class TestGamedayManagerModel:
    """Tests for GamedayManager model"""

    def test_str_representation(self):
        """Test __str__ method"""
        user = User.objects.create_user(username='test', password='test123')
        gameday = DBSetup().g62_status_empty()

        gm = GamedayManager.objects.create(
            user=user,
            gameday=gameday
        )

        assert str(gm) == f'test -> {gameday.name}'

    def test_default_permissions(self):
        """Test default permission values"""
        user = User.objects.create_user(username='test', password='test123')
        gameday = DBSetup().g62_status_empty()

        gm = GamedayManager.objects.create(
            user=user,
            gameday=gameday
        )

        assert gm.can_edit_details is True
        assert gm.can_assign_officials is True
        assert gm.can_manage_scores is True

    def test_unique_together_constraint(self):
        """Test unique_together constraint"""
        user = User.objects.create_user(username='test', password='test123')
        gameday = DBSetup().g62_status_empty()

        GamedayManager.objects.create(
            user=user,
            gameday=gameday
        )

        # Try to create duplicate
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            GamedayManager.objects.create(
                user=user,
                gameday=gameday
            )


@pytest.mark.django_db
class TestTeamManagerModel:
    """Tests for TeamManager model"""

    def test_str_representation(self):
        """Test __str__ method"""
        user = User.objects.create_user(username='test', password='test123')
        team = Team.objects.create(name='Test Team', description='Test')

        tm = TeamManager.objects.create(
            user=user,
            team=team
        )

        assert str(tm) == 'test -> Test Team'

    def test_default_permissions(self):
        """Test default permission values"""
        user = User.objects.create_user(username='test', password='test123')
        team = Team.objects.create(name='Test Team', description='Test')

        tm = TeamManager.objects.create(
            user=user,
            team=team
        )

        assert tm.can_edit_roster is True
        assert tm.can_submit_passcheck is True

    def test_unique_together_constraint(self):
        """Test unique_together constraint"""
        user = User.objects.create_user(username='test', password='test123')
        team = Team.objects.create(name='Test Team', description='Test')

        TeamManager.objects.create(
            user=user,
            team=team
        )

        # Try to create duplicate
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            TeamManager.objects.create(
                user=user,
                team=team
            )
