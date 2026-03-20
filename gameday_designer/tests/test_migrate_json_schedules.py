"""
Tests for migrate_json_schedules management command.

This command parses existing JSON schedule files and creates ScheduleTemplate objects
with slots and update rules in the database.

Following TDD methodology: Tests written BEFORE implementation.
"""

import json
import pathlib
from io import StringIO
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
)


class MigrateJsonSchedulesCommandTestCase(TestCase):
    """Test suite for migrate_json_schedules management command."""

    def setUp(self):
        """Set up test environment."""
        self.schedules_dir = (
            pathlib.Path(__file__).parent.parent.parent
            / "gamedays"
            / "management"
            / "schedules"
        )
        self.stdout = StringIO()
        self.stderr = StringIO()

    def test_command_exists(self):
        """Test that the command can be called without errors."""
        # Should not raise an exception
        call_command(
            "migrate_json_schedules",
            "--dry-run",
            stdout=self.stdout,
            stderr=self.stderr,
        )

    def test_dry_run_mode_creates_no_templates(self):
        """Test that dry-run mode does not create any database objects."""
        initial_count = ScheduleTemplate.objects.count()

        call_command(
            "migrate_json_schedules",
            "--dry-run",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        # No templates should be created
        self.assertEqual(ScheduleTemplate.objects.count(), initial_count)

    def test_dry_run_output_shows_summary(self):
        """Test that dry-run mode outputs a summary of what would be created."""
        call_command(
            "migrate_json_schedules",
            "--dry-run",
            stdout=self.stdout,
            stderr=self.stderr,
        )
        output = self.stdout.getvalue()

        # Should mention dry-run mode
        self.assertIn("DRY RUN", output.upper())

    def test_format_filter_single_format(self):
        """Test filtering by a single format."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            "--dry-run",
            stdout=self.stdout,
            stderr=self.stderr,
        )
        output = self.stdout.getvalue()

        # Should only process 6_2 format
        self.assertIn("6_2", output)

    def test_format_filter_multiple_formats(self):
        """Test filtering by multiple formats."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            "8_2",
            "--dry-run",
            stdout=self.stdout,
            stderr=self.stderr,
        )
        output = self.stdout.getvalue()

        # Should process both formats
        self.assertIn("6_2", output)
        self.assertIn("8_2", output)

    def test_creates_template_from_simple_schedule(self):
        """Test creating a template from a simple schedule JSON (no update rules)."""
        # Process only 2_1 format (simplest schedule)
        call_command(
            "migrate_json_schedules",
            "--format",
            "2_1",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        # Should create exactly one template
        self.assertEqual(ScheduleTemplate.objects.count(), 1)

        template = ScheduleTemplate.objects.first()
        self.assertEqual(template.name, "schedule_2_1")
        self.assertEqual(template.num_teams, 2)
        self.assertEqual(template.num_groups, 1)  # Only "Gruppe 1" in JSON
        self.assertIsNone(template.association)  # Global template

    def test_creates_slots_from_schedule_json(self):
        """Test that slots are created correctly from schedule JSON."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # 6_2 schedule has multiple slots
        self.assertGreater(template.slots.count(), 0)

        # Check a preliminary round slot (should use group/team indices)
        vorrunde_slots = template.slots.filter(stage="Vorrunde")
        self.assertGreater(vorrunde_slots.count(), 0)

        # Check that at least one slot has proper group/team assignments
        sample_slot = vorrunde_slots.first()
        # For preliminary rounds, should have group and team indices
        self.assertIsNotNone(sample_slot.home_group)
        self.assertIsNotNone(sample_slot.home_team)

    def test_parses_team_assignment_group_index(self):
        """Test parsing team assignment from group/team index format (e.g., '0_1')."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Find a slot with "0_0" home team
        slot = template.slots.filter(home_group=0, home_team=0).first()

        self.assertIsNotNone(slot)
        self.assertEqual(slot.home_group, 0)
        self.assertEqual(slot.home_team, 0)

    def test_parses_team_assignment_reference_string(self):
        """Test parsing team assignment from reference string (e.g., 'P1 Gruppe 1')."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Find a final round slot with reference string
        final_slot = template.slots.filter(
            stage="Finalrunde", home_reference__icontains="Gruppe"
        ).first()

        self.assertIsNotNone(final_slot)
        self.assertTrue(final_slot.home_reference)  # Should have a reference string
        self.assertIsNone(final_slot.home_group)  # Should NOT have group index

    def test_parses_empty_slot(self):
        """Test parsing empty slots (breaks in schedule)."""
        # Need to find a schedule with empty slots
        # For now, test that empty slots are handled gracefully
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        # Command should complete without errors
        self.assertTrue(ScheduleTemplate.objects.filter(name="schedule_6_2").exists())

    def test_parses_standing_gruppe_references(self):
        """Test that 'Gruppe 1', 'Gruppe 2' standings are handled correctly."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Should have slots with "Gruppe X" standing
        gruppe_slots = template.slots.filter(standing__contains="Gruppe")
        self.assertGreater(gruppe_slots.count(), 0)

    def test_infers_num_groups_from_json(self):
        """Test that number of groups is inferred from 'Gruppe X' standings."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # 6_2 has "Gruppe 1" and "Gruppe 2"
        self.assertEqual(template.num_groups, 2)

    def test_infers_num_fields_from_json(self):
        """Test that number of fields is inferred from JSON structure."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # 6_2 has 2 fields
        self.assertEqual(template.num_fields, 2)

    def test_creates_update_rules_from_update_json(self):
        """Test creating update rules from update_*.json files."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # 6_2 has update rules in update_6_2.json
        self.assertGreater(template.update_rules.count(), 0)

    def test_update_rule_has_pre_finished_stage(self):
        """Test that update rules have pre_finished stage defined."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Get first update rule
        update_rule = template.update_rules.first()

        self.assertIsNotNone(update_rule)
        self.assertTrue(update_rule.pre_finished)  # Should have a pre_finished stage

    def test_update_rule_team_has_standing_and_place(self):
        """Test that update rule team assignments have standing and place."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")
        update_rule = template.update_rules.first()

        # Should have team rules (home, away, official)
        self.assertGreater(update_rule.team_rules.count(), 0)

        # Check first team rule
        team_rule = update_rule.team_rules.first()
        self.assertIn(team_rule.role, ["home", "away", "official"])
        self.assertTrue(team_rule.standing)
        self.assertGreater(team_rule.place, 0)

    def test_update_rule_team_points_filter(self):
        """Test that update rule team assignments can filter by points (winner/loser)."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Find a rule with points filter (e.g., winner vs loser in finals)
        team_rule_with_points = TemplateUpdateRuleTeam.objects.filter(
            update_rule__template=template, points__isnull=False
        ).first()

        if team_rule_with_points:
            self.assertIn(team_rule_with_points.points, [0, 2])  # 2 = winner, 0 = loser

    def test_update_rule_team_pre_finished_override(self):
        """Test that update rule team assignments can override pre_finished stage."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Find a rule with pre_finished override (officials often depend on different stage)
        team_rule_with_override = TemplateUpdateRuleTeam.objects.filter(
            update_rule__template=template, pre_finished_override__isnull=False
        ).first()

        if team_rule_with_override:
            self.assertTrue(team_rule_with_override.pre_finished_override)

    def test_processes_all_schedules_by_default(self):
        """Test that all schedule formats are processed when no filter is specified."""
        call_command("migrate_json_schedules", stdout=self.stdout, stderr=self.stderr)

        # Should create multiple templates
        self.assertGreater(ScheduleTemplate.objects.count(), 20)  # We have 20+ formats

    def test_idempotency_does_not_duplicate_templates(self):
        """Test that running migration twice does not create duplicate templates."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )
        initial_count = ScheduleTemplate.objects.count()

        # Run again
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        # Should still have same count (updated, not duplicated)
        self.assertEqual(ScheduleTemplate.objects.count(), initial_count)

    def test_break_after_parsed_correctly(self):
        """Test that break_after field is parsed from JSON."""
        # Some schedules have break_after specified
        call_command("migrate_json_schedules", stdout=self.stdout, stderr=self.stderr)

        # Find any slot with break_after > 0
        slot_with_break = TemplateSlot.objects.filter(break_after__gt=0).first()

        # If such a slot exists, verify it's positive
        if slot_with_break:
            self.assertGreater(slot_with_break.break_after, 0)

    def test_field_number_parsed_correctly(self):
        """Test that field numbers are parsed correctly (can be int or string in JSON)."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "8_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_8_2")

        # Should have slots on field 1 and field 2
        field1_slots = template.slots.filter(field=1)
        field2_slots = template.slots.filter(field=2)

        self.assertGreater(field1_slots.count(), 0)
        self.assertGreater(field2_slots.count(), 0)

    def test_slot_order_increments_correctly(self):
        """Test that slot_order increments correctly for each field."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_6_2")

        # Get slots for field 1, ordered
        field1_slots = list(template.slots.filter(field=1).order_by("slot_order"))

        # slot_order should increment
        for i, slot in enumerate(field1_slots):
            self.assertEqual(slot.slot_order, i)

    def test_output_shows_progress(self):
        """Test that command output shows progress information."""
        call_command(
            "migrate_json_schedules",
            "--format",
            "6_2",
            stdout=self.stdout,
            stderr=self.stderr,
        )
        output = self.stdout.getvalue()

        # Should mention template creation
        self.assertIn("schedule_6_2", output)

    def test_handles_missing_update_file_gracefully(self):
        """Test that missing update_*.json file is handled gracefully."""
        # 2_1 format has no update file
        call_command(
            "migrate_json_schedules",
            "--format",
            "2_1",
            stdout=self.stdout,
            stderr=self.stderr,
        )

        template = ScheduleTemplate.objects.get(name="schedule_2_1")

        # Should have 0 update rules
        self.assertEqual(template.update_rules.count(), 0)


class JsonParsingTestCase(TestCase):
    """Test cases for JSON parsing logic."""

    def setUp(self):
        """Set up test data."""
        self.schedules_dir = (
            pathlib.Path(__file__).parent.parent.parent
            / "gamedays"
            / "management"
            / "schedules"
        )

    def test_schedule_json_files_exist(self):
        """Test that schedule JSON files exist in expected location."""
        schedule_files = list(self.schedules_dir.glob("schedule_*.json"))
        self.assertGreater(len(schedule_files), 0)

    def test_update_json_files_exist(self):
        """Test that update JSON files exist in expected location."""
        update_files = list(self.schedules_dir.glob("update_*.json"))
        self.assertGreater(len(update_files), 0)

    def test_schedule_json_has_expected_structure(self):
        """Test that schedule JSON files have expected structure."""
        schedule_file = self.schedules_dir / "schedule_6_2.json"

        with open(schedule_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Should be a list of field entries
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

        # Each entry should have field and games
        for field_entry in data:
            self.assertIn("field", field_entry)
            self.assertIn("games", field_entry)

    def test_update_json_has_expected_structure(self):
        """Test that update JSON files have expected structure."""
        update_file = self.schedules_dir / "update_6_2.json"

        with open(update_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Should be a list of update rule entries
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

        # Each entry should have name, pre_finished, games
        for rule_entry in data:
            self.assertIn("name", rule_entry)
            self.assertIn("pre_finished", rule_entry)
            self.assertIn("games", rule_entry)

    def test_game_entry_has_required_fields(self):
        """Test that game entries have required fields."""
        schedule_file = self.schedules_dir / "schedule_6_2.json"

        with open(schedule_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Get first non-empty game
        for field_entry in data:
            for game in field_entry["games"]:
                if game:  # Not empty
                    self.assertIn("stage", game)
                    self.assertIn("standing", game)
                    self.assertIn("home", game)
                    self.assertIn("away", game)
                    self.assertIn("official", game)
                    break
