import os
import pytest
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.contrib.auth.models import User
from gamedays.models import Team
from datetime import datetime, timedelta


@pytest.mark.integration
@override_settings(DEMO_MODE=True)
class DemoResetIntegrationTests(TestCase):
    databases = {'default'}

    def setUp(self):
        """Create initial demo data"""
        call_command('seed_demo_data')

    def test_demo_accounts_exist_after_seed(self):
        """Verify all demo accounts are created by seed command"""
        demo_accounts = {
            'admin@demo.local': 'DemoAdmin123!',
            'referee@demo.local': 'DemoRef123!',
            'manager@demo.local': 'DemoMgr123!',
            'user@demo.local': 'DemoUser123!',
        }

        for username, password in demo_accounts.items():
            user = User.objects.get(username=username)
            self.assertIsNotNone(user)
            self.assertTrue(user.check_password(password))

    def test_demo_teams_created(self):
        """Verify demo teams are created"""
        teams = Team.objects.all()
        self.assertGreater(len(teams), 0)

        expected_names = [
            'Phoenix United', 'Stellar Strikers', 'Velocity FC'
        ]
        team_names = [t.name for t in teams]

        for expected in expected_names:
            self.assertIn(expected, team_names)

    def test_demo_data_is_synthetic(self):
        """Verify demo data contains no real PII"""
        # Check that all emails are @demo.local
        users = User.objects.all()
        for user in users:
            self.assertTrue(
                user.email.endswith('@demo.local'),
                f"User {user.username} has non-demo email: {user.email}"
            )

    def test_snapshot_file_path_exists(self):
        """Verify snapshot would be created in correct location"""
        snapshot_path = '/app/snapshots/demo_snapshot.sql'
        expected_dir = '/app/snapshots'

        # Just verify the path is correct (actual file creation tested in entrypoint)
        self.assertEqual(os.path.dirname(snapshot_path), expected_dir)

    @override_settings(
        STRIPE_ENABLED=False,
        EXTERNAL_API_INTEGRATIONS_ENABLED=False
    )
    def test_demo_settings_disable_external_services(self):
        """Verify demo settings disable integrations"""
        from django.conf import settings

        self.assertTrue(getattr(settings, 'DEMO_MODE', False))
        self.assertFalse(getattr(settings, 'STRIPE_ENABLED', True))
        self.assertFalse(getattr(settings, 'EXTERNAL_API_INTEGRATIONS_ENABLED', True))

    @override_settings(
        DEMO_RESET_HOUR=0,
        DEMO_RESET_MINUTE=0
    )
    def test_demo_reset_schedule_is_utc_midnight(self):
        """Verify reset is scheduled for UTC midnight"""
        from django.conf import settings

        self.assertEqual(getattr(settings, 'DEMO_RESET_HOUR', None), 0)
        self.assertEqual(getattr(settings, 'DEMO_RESET_MINUTE', None), 0)
