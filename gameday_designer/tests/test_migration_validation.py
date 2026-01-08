"""
Parametrized validation tests comparing JSON-based vs template-based gameday creation.

These tests ensure that migrated templates produce IDENTICAL gamedays to the original JSON method.
For each schedule format:
  1. Create gameday using existing JSON-based ScheduleCreator
  2. Create gameday using migrated ScheduleTemplate
  3. Compare: must be 100% identical

Following TDD methodology: Tests written BEFORE template application implementation.
"""
import datetime
from typing import List

import pytest
from django.core.management import call_command
from django.test import TestCase

from gamedays.management.schedule_manager import Schedule, ScheduleCreator, GroupSchedule
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Association
from gamedays.tests.setup_factories.db_setup import DBSetup
from gameday_designer.models import ScheduleTemplate


# All schedule formats to test
SCHEDULE_FORMATS = [
    '2_1',
    '3_1',
    '3_hinrunde_1',
    '4_1',
    '4_final4_1',
    '5_2',
    '5_dffl1_2',
    '5_dfflf_2',
    '6_2',
    '6_oneDivision_2',
    '6_sfl_2',
    '7_2',
    '7_oneDivision_2',
    '7_sfl_2',
    '8_2',
    '8_3',
    '8_doublevictory_2',
    '8_final8_3',
    '8_vfpd_2',
    '9_2',
    '9_3',
    '9_groupfinals_2',
    '11_3',
]


class TemplateApplicationHelper:
    """
    Helper class to apply templates to gamedays.

    This will be implemented in Phase 1, but we define the interface here
    so we can write validation tests now.
    """

    @staticmethod
    def apply_template_to_gameday(template: ScheduleTemplate, gameday: Gameday, team_groups: List[List[Team]]):
        """
        Apply template to gameday, creating Gameinfo and Gameresult objects.

        Args:
            template: ScheduleTemplate to apply
            gameday: Gameday to populate
            team_groups: List of team lists, one per group (e.g., [[A1, A2, A3], [B1, B2, B3]])

        This is a placeholder - actual implementation will come in Phase 1.
        For now, we'll test with JSON-based method only and skip template tests.
        """
        raise NotImplementedError("Template application will be implemented in Phase 1")


class TestScheduleMigrationValidation(TestCase):
    """
    Validation tests for all schedule formats.

    Each test verifies that the migrated template produces identical results
    to the original JSON-based schedule creation.

    Note: Parametrize decorator doesn't work well with Django TestCase,
    so we generate individual test methods dynamically.
    """

    def setUp(self):
        """Set up test environment for each format."""
        # Create basic database objects
        DBSetup().create_playoff_placeholder_teams()

    def _create_team_groups(self, format_name: str) -> List[List[Team]]:
        """
        Create team groups based on format.

        Returns list of team lists, one per group.
        """
        # Parse format to determine number of teams and groups
        parts = format_name.split('_')
        num_teams = int(parts[0])

        # Determine number of groups based on format
        if format_name in ['6_oneDivision_2', '7_oneDivision_2']:
            # Single division formats
            num_groups = 1
        elif format_name.endswith('_3'):
            # 3-group formats
            num_groups = 3
        elif format_name.endswith('_2') or format_name.endswith('_1'):
            # Most formats have 1 or 2 groups
            # Need to infer from num_teams
            if num_teams >= 6 and not format_name.startswith('3_'):
                num_groups = 2
            else:
                num_groups = 1
        else:
            num_groups = 1

        # Create teams evenly distributed across groups
        teams_per_group = num_teams // num_groups
        team_groups = []

        for group_idx in range(num_groups):
            group_letter = chr(65 + group_idx)  # A, B, C, ...
            teams = DBSetup().create_teams(group_letter, teams_per_group)
            team_groups.append(teams)

        return team_groups

    def _create_gameday_from_json(self, format_name: str, team_groups: List[List[Team]]) -> Gameday:
        """Create gameday using original JSON-based method."""
        gameday = DBSetup().create_empty_gameday()

        # Create GroupSchedule objects
        group_schedules = []
        for idx, teams in enumerate(team_groups):
            group_name = f'Gruppe {idx + 1}'
            group_schedules.append(GroupSchedule(name=group_name, league_group=None, teams=teams))

        # Create schedule and apply to gameday
        # Refetch gameday from DB to ensure we have correct types
        gameday = Gameday.objects.get(pk=gameday.pk)
        schedule = Schedule(format_name, group_schedules)
        schedule_creator = ScheduleCreator(gameday, schedule)
        schedule_creator.create()

        return gameday

    def _create_gameday_from_template(self, format_name: str, team_groups: List[List[Team]]) -> Gameday:
        """Create gameday using migrated template."""
        # This will be implemented in Phase 1
        # For now, we'll skip these tests
        raise NotImplementedError("Template application will be implemented in Phase 1")

    def _compare_gamedays(self, gameday1: Gameday, gameday2: Gameday):
        """
        Compare two gamedays to verify they are identical.

        Checks:
        - Same number of games
        - Each game has same: field, scheduled time, stage, standing, teams, officials
        - Games are in same order
        """
        gameinfos1 = list(Gameinfo.objects.filter(gameday=gameday1).order_by('field', 'scheduled'))
        gameinfos2 = list(Gameinfo.objects.filter(gameday=gameday2).order_by('field', 'scheduled'))

        # Same number of games
        self.assertEqual(
            len(gameinfos1),
            len(gameinfos2),
            f"Different number of games: {len(gameinfos1)} vs {len(gameinfos2)}"
        )

        # Compare each game
        for i, (info1, info2) in enumerate(zip(gameinfos1, gameinfos2)):
            with self.subTest(game_index=i):
                # Field
                self.assertEqual(info1.field, info2.field, f"Game {i}: Different field")

                # Scheduled time
                self.assertEqual(info1.scheduled, info2.scheduled, f"Game {i}: Different scheduled time")

                # Stage
                self.assertEqual(info1.stage, info2.stage, f"Game {i}: Different stage")

                # Standing
                self.assertEqual(info1.standing, info2.standing, f"Game {i}: Different standing")

                # Officials
                self.assertEqual(info1.officials, info2.officials, f"Game {i}: Different officials")

                # Teams (home and away)
                results1 = list(Gameresult.objects.filter(gameinfo=info1).order_by('-isHome'))
                results2 = list(Gameresult.objects.filter(gameinfo=info2).order_by('-isHome'))

                self.assertEqual(len(results1), 2, f"Game {i}: Should have 2 results")
                self.assertEqual(len(results2), 2, f"Game {i}: Should have 2 results")

                # Home team
                self.assertEqual(
                    results1[0].team,
                    results2[0].team,
                    f"Game {i}: Different home team"
                )

                # Away team
                self.assertEqual(
                    results1[1].team,
                    results2[1].team,
                    f"Game {i}: Different away team"
                )

    def _test_json_schedule_creates_gameday(self, format_name):
        """
        Test that JSON-based schedule creation works for a specific format.

        This validates the baseline: the existing JSON method should work correctly.
        """
        team_groups = self._create_team_groups(format_name)
        gameday = self._create_gameday_from_json(format_name, team_groups)

        # Verify gameday was created with games
        gameinfos = Gameinfo.objects.filter(gameday=gameday)
        self.assertGreater(gameinfos.count(), 0, f"Format {format_name}: No games created")

        # Verify each game has 2 teams
        for gameinfo in gameinfos:
            results = Gameresult.objects.filter(gameinfo=gameinfo)
            self.assertEqual(results.count(), 2, f"Format {format_name}: Game should have 2 teams")

    def _test_template_migration_creates_identical_gameday(self, format_name):
        """
        Test that migrated template creates IDENTICAL gameday to JSON method.

        This is the critical validation test: migrated templates must produce
        exactly the same results as the original JSON files.

        Note: Skipped for now - will be implemented in Phase 1.
        """
        # Migrate template
        call_command('migrate_json_schedules', '--format', format_name, verbosity=0)

        # Verify template was created
        template = ScheduleTemplate.objects.get(name=f'schedule_{format_name}')
        self.assertIsNotNone(template)

        # Create team groups
        team_groups = self._create_team_groups(format_name)

        # Create gameday using JSON method
        gameday_json = self._create_gameday_from_json(format_name, team_groups)

        # Create gameday using template method
        gameday_template = self._create_gameday_from_template(format_name, team_groups)

        # Compare: must be identical
        self._compare_gamedays(gameday_json, gameday_template)

    # Sample tests for a few formats (proof of concept)
    def test_json_schedule_creates_gameday_2_1(self):
        """Test JSON schedule creation for 2_1 format."""
        self._test_json_schedule_creates_gameday('2_1')

    def test_json_schedule_creates_gameday_4_1(self):
        """Test JSON schedule creation for 4_1 format."""
        self._test_json_schedule_creates_gameday('4_1')

    def test_json_schedule_creates_gameday_6_2(self):
        """Test JSON schedule creation for 6_2 format."""
        self._test_json_schedule_creates_gameday('6_2')


class TestMigrationCoverage(TestCase):
    """Test that migration covers all schedule formats."""

    def test_all_formats_have_json_files(self):
        """Verify that all test formats have corresponding JSON files."""
        import pathlib

        schedules_dir = pathlib.Path(__file__).parent.parent.parent / 'gamedays' / 'management' / 'schedules'

        for format_name in SCHEDULE_FORMATS:
            schedule_file = schedules_dir / f'schedule_{format_name}.json'
            self.assertTrue(
                schedule_file.exists(),
                f"Schedule file not found for format: {format_name}"
            )

    def test_migration_creates_all_templates(self):
        """Verify that migration creates templates for all formats."""
        # Run migration
        call_command('migrate_json_schedules', verbosity=0)

        # Check all templates were created
        for format_name in SCHEDULE_FORMATS:
            template = ScheduleTemplate.objects.filter(name=f'schedule_{format_name}')
            self.assertTrue(
                template.exists(),
                f"Template not created for format: {format_name}"
            )


class TestTemplateStructure(TestCase):
    """Test migrated template structure for correctness."""

    def setUp(self):
        """Migrate all templates."""
        call_command('migrate_json_schedules', verbosity=0)

    def test_template_has_correct_num_teams(self):
        """Test that templates have correct number of teams."""
        for format_name in SCHEDULE_FORMATS:
            with self.subTest(format=format_name):
                template = ScheduleTemplate.objects.get(name=f'schedule_{format_name}')

                # Extract expected num_teams from format name
                expected_num_teams = int(format_name.split('_')[0])

                self.assertEqual(
                    template.num_teams,
                    expected_num_teams,
                    f"Format {format_name}: Wrong num_teams"
                )

    def test_template_has_slots(self):
        """Test that all templates have at least one slot."""
        for format_name in SCHEDULE_FORMATS:
            with self.subTest(format=format_name):
                template = ScheduleTemplate.objects.get(name=f'schedule_{format_name}')

                self.assertGreater(
                    template.slots.count(),
                    0,
                    f"Format {format_name}: No slots created"
                )

    def test_template_slots_have_valid_team_assignments(self):
        """Test that all slots have valid team assignments (either indices or references)."""
        for format_name in SCHEDULE_FORMATS:
            with self.subTest(format=format_name):
                template = ScheduleTemplate.objects.get(name=f'schedule_{format_name}')

                for slot in template.slots.all():
                    # Home team: must have either (group, team) OR reference
                    has_home_indices = slot.home_group is not None and slot.home_team is not None
                    has_home_ref = bool(slot.home_reference)
                    self.assertTrue(
                        has_home_indices or has_home_ref,
                        f"Format {format_name}, Slot {slot.id}: No home team assignment"
                    )

                    # Away team: must have either (group, team) OR reference
                    has_away_indices = slot.away_group is not None and slot.away_team is not None
                    has_away_ref = bool(slot.away_reference)
                    self.assertTrue(
                        has_away_indices or has_away_ref,
                        f"Format {format_name}, Slot {slot.id}: No away team assignment"
                    )

                    # Official: must have either (group, team) OR reference
                    has_official_indices = slot.official_group is not None and slot.official_team is not None
                    has_official_ref = bool(slot.official_reference)
                    self.assertTrue(
                        has_official_indices or has_official_ref,
                        f"Format {format_name}, Slot {slot.id}: No official assignment"
                    )
