"""Tests for manager serializers"""
import pytest
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError

from gamedays.api.serializers import (
    LeagueManagerSerializer,
    GamedayManagerSerializer,
    TeamManagerSerializer,
)
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


@pytest.mark.django_db
class TestLeagueManagerSerializer:
    """Tests for LeagueManagerSerializer"""

    def setup_method(self):
        self.user = User.objects.create_user(username='test', password='test123')
        self.league = DBSetup().create_league()
        self.season = Season.objects.create(name='2024')

    def test_serialize_league_manager(self):
        """Test serializing a league manager"""
        lm = LeagueManager.objects.create(
            user=self.user,
            league=self.league,
            season=self.season,
            created_by=self.user
        )

        serializer = LeagueManagerSerializer(lm)
        data = serializer.data

        assert data['user_id'] == self.user.pk
        assert data['user_username'] == 'test'
        assert data['league'] == self.league.pk
        assert data['league_name'] == self.league.name
        assert data['season'] == self.season.pk
        assert data['season_name'] == '2024'

    def test_serialize_league_manager_without_season(self):
        """Test serializing league manager with NULL season"""
        lm = LeagueManager.objects.create(
            user=self.user,
            league=self.league,
            season=None,
            created_by=self.user
        )

        serializer = LeagueManagerSerializer(lm)
        data = serializer.data

        assert data['season'] is None
        assert data['season_name'] == 'All Seasons'

    def test_create_league_manager_valid(self):
        """Test creating a league manager with valid data"""
        data = {
            'user_id': self.user.pk,
            'league': self.league.pk,
            'season_id': self.season.pk,
        }

        serializer = LeagueManagerSerializer(data=data)
        assert serializer.is_valid()

        lm = serializer.save(created_by=self.user)
        assert lm.user == self.user
        assert lm.league == self.league
        assert lm.season == self.season

    def test_create_league_manager_invalid_user(self):
        """Test creating league manager with invalid user_id"""
        data = {
            'user_id': 99999,
            'league': self.league.pk,
            'season_id': self.season.pk,
        }

        serializer = LeagueManagerSerializer(data=data)
        assert serializer.is_valid()

        with pytest.raises(ValidationError, match="User with id 99999 does not exist"):
            serializer.save()

    def test_create_league_manager_without_season(self):
        """Test creating league manager without season (all seasons)"""
        data = {
            'user_id': self.user.pk,
            'league': self.league.pk,
        }

        serializer = LeagueManagerSerializer(data=data)
        assert serializer.is_valid()

        lm = serializer.save(created_by=self.user)
        assert lm.season is None

    def test_create_league_manager_invalid_season(self):
        """Test creating league manager with invalid season_id"""
        data = {
            'user_id': self.user.pk,
            'league': self.league.pk,
            'season_id': 99999,
        }

        serializer = LeagueManagerSerializer(data=data)
        assert serializer.is_valid()

        with pytest.raises(ValidationError, match="Season with id 99999 does not exist"):
            serializer.save()


@pytest.mark.django_db
class TestGamedayManagerSerializer:
    """Tests for GamedayManagerSerializer"""

    def setup_method(self):
        self.user = User.objects.create_user(username='test', password='test123')
        self.gameday = DBSetup().g62_status_empty()

    def test_serialize_gameday_manager(self):
        """Test serializing a gameday manager"""
        gm = GamedayManager.objects.create(
            user=self.user,
            gameday=self.gameday,
            can_edit_details=True,
            can_assign_officials=False,
            can_manage_scores=True,
            assigned_by=self.user
        )

        serializer = GamedayManagerSerializer(gm)
        data = serializer.data

        assert data['user_id'] == self.user.pk
        assert data['user_username'] == 'test'
        assert data['gameday'] == self.gameday.pk
        assert data['gameday_name'] == self.gameday.name
        assert data['can_edit_details'] is True
        assert data['can_assign_officials'] is False
        assert data['can_manage_scores'] is True

    def test_create_gameday_manager_valid(self):
        """Test creating a gameday manager with valid data"""
        data = {
            'user_id': self.user.pk,
            'gameday': self.gameday.pk,
            'can_edit_details': True,
            'can_assign_officials': True,
            'can_manage_scores': False,
        }

        serializer = GamedayManagerSerializer(data=data)
        assert serializer.is_valid()

        gm = serializer.save(assigned_by=self.user)
        assert gm.user == self.user
        assert gm.gameday == self.gameday
        assert gm.can_edit_details is True
        assert gm.can_assign_officials is True
        assert gm.can_manage_scores is False

    def test_create_gameday_manager_invalid_user(self):
        """Test creating gameday manager with invalid user_id"""
        data = {
            'user_id': 99999,
            'gameday': self.gameday.pk,
        }

        serializer = GamedayManagerSerializer(data=data)
        assert serializer.is_valid()

        with pytest.raises(ValidationError, match="User with id 99999 does not exist"):
            serializer.save()

    def test_create_gameday_manager_defaults(self):
        """Test creating gameday manager with default permissions"""
        data = {
            'user_id': self.user.pk,
            'gameday': self.gameday.pk,
        }

        serializer = GamedayManagerSerializer(data=data)
        assert serializer.is_valid()

        gm = serializer.save(assigned_by=self.user)
        # Check defaults from model
        assert gm.can_edit_details is True
        assert gm.can_assign_officials is True
        assert gm.can_manage_scores is True

    def test_update_gameday_manager_permissions(self):
        """Test updating gameday manager permissions"""
        gm = GamedayManager.objects.create(
            user=self.user,
            gameday=self.gameday,
            can_edit_details=True,
            can_assign_officials=False,
            can_manage_scores=False
        )

        data = {
            'can_assign_officials': True,
            'can_manage_scores': True,
        }

        serializer = GamedayManagerSerializer(gm, data=data, partial=True)
        assert serializer.is_valid()

        gm = serializer.save()
        assert gm.can_edit_details is True  # unchanged
        assert gm.can_assign_officials is True  # updated
        assert gm.can_manage_scores is True  # updated


@pytest.mark.django_db
class TestTeamManagerSerializer:
    """Tests for TeamManagerSerializer"""

    def setup_method(self):
        self.user = User.objects.create_user(username='test', password='test123')
        self.team = Team.objects.create(name='Test Team', description='Test')

    def test_serialize_team_manager(self):
        """Test serializing a team manager"""
        tm = TeamManager.objects.create(
            user=self.user,
            team=self.team,
            can_edit_roster=True,
            can_submit_passcheck=False,
            assigned_by=self.user
        )

        serializer = TeamManagerSerializer(tm)
        data = serializer.data

        assert data['user_id'] == self.user.pk
        assert data['user_username'] == 'test'
        assert data['team'] == self.team.pk
        assert data['team_name'] == 'Test Team'
        assert data['can_edit_roster'] is True
        assert data['can_submit_passcheck'] is False

    def test_create_team_manager_valid(self):
        """Test creating a team manager with valid data"""
        data = {
            'user_id': self.user.pk,
            'team': self.team.pk,
            'can_edit_roster': True,
            'can_submit_passcheck': False,
        }

        serializer = TeamManagerSerializer(data=data)
        assert serializer.is_valid()

        tm = serializer.save(assigned_by=self.user)
        assert tm.user == self.user
        assert tm.team == self.team
        assert tm.can_edit_roster is True
        assert tm.can_submit_passcheck is False

    def test_create_team_manager_invalid_user(self):
        """Test creating team manager with invalid user_id"""
        data = {
            'user_id': 99999,
            'team': self.team.pk,
        }

        serializer = TeamManagerSerializer(data=data)
        assert serializer.is_valid()

        with pytest.raises(ValidationError, match="User with id 99999 does not exist"):
            serializer.save()

    def test_create_team_manager_defaults(self):
        """Test creating team manager with default permissions"""
        data = {
            'user_id': self.user.pk,
            'team': self.team.pk,
        }

        serializer = TeamManagerSerializer(data=data)
        assert serializer.is_valid()

        tm = serializer.save(assigned_by=self.user)
        # Check defaults from model
        assert tm.can_edit_roster is True
        assert tm.can_submit_passcheck is True

    def test_update_team_manager_permissions(self):
        """Test updating team manager permissions"""
        tm = TeamManager.objects.create(
            user=self.user,
            team=self.team,
            can_edit_roster=True,
            can_submit_passcheck=True
        )

        data = {
            'can_submit_passcheck': False,
        }

        serializer = TeamManagerSerializer(tm, data=data, partial=True)
        assert serializer.is_valid()

        tm = serializer.save()
        assert tm.can_edit_roster is True  # unchanged
        assert tm.can_submit_passcheck is False  # updated
