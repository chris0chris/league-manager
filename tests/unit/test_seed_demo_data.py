import pytest
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.contrib.auth.models import User
from gamedays.models import Team, Season, League, Association, SeasonLeagueTeam
from io import StringIO


@pytest.mark.unit
@override_settings(DEMO_MODE=True)
class SeedDemoDataCommandTests(TestCase):
    databases = {'default'}

    def test_command_creates_associations(self):
        """Test that seed command creates expected associations"""
        call_command('seed_demo_data')

        associations = Association.objects.all()
        self.assertGreaterEqual(len(associations), 4)

        assoc_names = [a.name for a in associations]
        self.assertIn('Metropolitan Premier League', assoc_names)

    def test_command_creates_teams(self):
        """Test that seed command creates expected teams"""
        call_command('seed_demo_data')

        teams = Team.objects.all()
        self.assertGreaterEqual(len(teams), 12)

    def test_command_creates_demo_users(self):
        """Test that seed command creates all demo users"""
        call_command('seed_demo_data')

        users = User.objects.filter(email__endswith='@demo.local')
        self.assertEqual(len(users), 4)

        usernames = {u.username for u in users}
        expected = {
            'admin@demo.local',
            'referee@demo.local',
            'manager@demo.local',
            'user@demo.local',
        }
        self.assertEqual(usernames, expected)

    def test_command_creates_seasons(self):
        """Test that seed command creates expected seasons"""
        call_command('seed_demo_data')

        seasons = Season.objects.all()
        self.assertGreaterEqual(len(seasons), 3)

        season_names = [s.name for s in seasons]
        expected_seasons = ['2023/2024', '2024/2025', '2025/2026']
        for expected in expected_seasons:
            self.assertIn(expected, season_names)

    def test_command_creates_leagues(self):
        """Test that seed command creates expected leagues"""
        call_command('seed_demo_data')

        leagues = League.objects.all()
        self.assertGreaterEqual(len(leagues), 4)

        league_names = [l.name for l in leagues]
        expected_leagues = [
            'Premier Division',
            'Championship Division',
            'League One',
            'League Two',
        ]
        for expected in expected_leagues:
            self.assertIn(expected, league_names)

    def test_command_creates_season_league_teams(self):
        """Test that seed command creates season-league-team relationships"""
        call_command('seed_demo_data')

        season_league_teams = SeasonLeagueTeam.objects.all()
        self.assertGreater(len(season_league_teams), 0)

    def test_command_output_success_message(self):
        """Test that command outputs success message"""
        out = StringIO()
        call_command('seed_demo_data', stdout=out)

        output = out.getvalue()
        self.assertIn('successfully', output.lower())

    def test_admin_user_is_superuser(self):
        """Test that admin@demo.local is a superuser"""
        call_command('seed_demo_data')

        admin = User.objects.get(username='admin@demo.local')
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)

    def test_regular_user_is_not_superuser(self):
        """Test that regular users are not superusers"""
        call_command('seed_demo_data')

        user = User.objects.get(username='user@demo.local')
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_staff)

    def test_teams_have_expected_names(self):
        """Test that seed command creates teams with expected names"""
        call_command('seed_demo_data')

        expected_teams = [
            'Phoenix United',
            'Stellar Strikers',
            'Velocity FC',
            'Thunder Titans',
            'Crystal Eagles',
            'Quantum Wolves',
        ]

        teams = Team.objects.all()
        team_names = [t.name for t in teams]

        for expected in expected_teams:
            self.assertIn(expected, team_names)

    def test_teams_have_associations(self):
        """Test that all teams have associations"""
        call_command('seed_demo_data')

        teams = Team.objects.all()
        self.assertGreater(len(teams), 0)

        for team in teams:
            self.assertIsNotNone(team.association)

    def test_teams_have_locations(self):
        """Test that all teams have location data"""
        call_command('seed_demo_data')

        teams = Team.objects.all()
        self.assertGreater(len(teams), 0)

        for team in teams:
            self.assertIsNotNone(team.location)
            self.assertTrue(len(team.location) > 0)

    def test_associations_have_abbreviations(self):
        """Test that associations have proper abbreviations"""
        call_command('seed_demo_data')

        associations = Association.objects.all()

        expected_abbrs = ['MPL', 'UNC', 'CSF', 'RSF']
        actual_abbrs = [a.abbr for a in associations]

        for expected in expected_abbrs:
            self.assertIn(expected, actual_abbrs)

    def test_demo_users_have_emails(self):
        """Test that all demo users have email addresses"""
        call_command('seed_demo_data')

        users = User.objects.filter(email__endswith='@demo.local')

        for user in users:
            self.assertIsNotNone(user.email)
            self.assertTrue(len(user.email) > 0)
            self.assertTrue(user.email.endswith('@demo.local'))

    def test_seasons_have_slugs(self):
        """Test that all seasons have slugs"""
        call_command('seed_demo_data')

        seasons = Season.objects.all()

        for season in seasons:
            self.assertIsNotNone(season.slug)
            self.assertTrue(len(season.slug) > 0)

    def test_leagues_have_slugs(self):
        """Test that all leagues have slugs"""
        call_command('seed_demo_data')

        leagues = League.objects.all()

        for league in leagues:
            self.assertIsNotNone(league.slug)
            self.assertTrue(len(league.slug) > 0)

    def test_idempotent_command(self):
        """Test that running command twice creates same data"""
        call_command('seed_demo_data')
        user_count_1 = User.objects.filter(email__endswith='@demo.local').count()
        team_count_1 = Team.objects.count()
        association_count_1 = Association.objects.count()

        call_command('seed_demo_data')
        user_count_2 = User.objects.filter(email__endswith='@demo.local').count()
        team_count_2 = Team.objects.count()
        association_count_2 = Association.objects.count()

        self.assertEqual(user_count_1, user_count_2)
        self.assertEqual(team_count_1, team_count_2)
        self.assertEqual(association_count_1, association_count_2)
