"""
Management command to migrate JSON schedule files to database templates.

This command parses existing JSON schedule files from gamedays/management/schedules/
and creates ScheduleTemplate objects with slots and update rules in the database.

Usage:
    python manage.py migrate_json_schedules [--dry-run] [--format 6_2 8_2 ...]

Following TDD methodology: Implementation written to pass tests.
"""
import json
import pathlib
import re
from typing import Dict, List, Optional, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam
)


class Command(BaseCommand):
    """
    Migrate JSON schedule files to database templates.

    Parses schedule_*.json and update_*.json files, creating ScheduleTemplate objects
    with associated slots and update rules.
    """

    help = 'Migrate JSON schedule files to database templates'

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes',
        )
        parser.add_argument(
            '--format',
            nargs='+',
            help='Specific format(s) to migrate (e.g., 6_2 8_2). If omitted, migrates all.',
        )

    def handle(self, *args, **options):
        """Execute the command."""
        dry_run = options['dry_run']
        formats = options.get('format')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        schedules_dir = self._get_schedules_dir()

        # Get all schedule files
        schedule_files = self._get_schedule_files(schedules_dir, formats)

        if not schedule_files:
            raise CommandError('No schedule files found')

        self.stdout.write(f'Found {len(schedule_files)} schedule file(s)')

        migrated_count = 0
        for schedule_file in schedule_files:
            format_name = self._extract_format_from_filename(schedule_file.name)

            if dry_run:
                self.stdout.write(f'  [DRY RUN] Would migrate: schedule_{format_name}')
            else:
                try:
                    self._migrate_schedule(schedules_dir, format_name)
                    self.stdout.write(
                        self.style.SUCCESS(f'  Migrated: schedule_{format_name}')
                    )
                    migrated_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  Failed to migrate schedule_{format_name}: {e}')
                    )

        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would migrate {len(schedule_files)} template(s)'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully migrated {migrated_count} template(s)'))

    def _get_schedules_dir(self) -> pathlib.Path:
        """Get the path to schedules directory."""
        # gameday_designer/management/commands/migrate_json_schedules.py
        # Need to go up to project root, then to gamedays/management/schedules
        base_dir = pathlib.Path(__file__).parent.parent.parent.parent
        schedules_dir = base_dir / 'gamedays' / 'management' / 'schedules'

        if not schedules_dir.exists():
            raise CommandError(f'Schedules directory not found: {schedules_dir}')

        return schedules_dir

    def _get_schedule_files(self, schedules_dir: pathlib.Path, formats: Optional[List[str]]) -> List[pathlib.Path]:
        """Get schedule files to migrate, optionally filtered by format."""
        if formats:
            # Get specific formats
            files = []
            for fmt in formats:
                schedule_file = schedules_dir / f'schedule_{fmt}.json'
                if schedule_file.exists():
                    files.append(schedule_file)
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Schedule file not found: {schedule_file.name}')
                    )
            return files
        else:
            # Get all schedule files
            return sorted(schedules_dir.glob('schedule_*.json'))

    def _extract_format_from_filename(self, filename: str) -> str:
        """Extract format from filename (e.g., 'schedule_6_2.json' -> '6_2')."""
        match = re.match(r'schedule_(.+)\.json', filename)
        if match:
            return match.group(1)
        raise ValueError(f'Invalid schedule filename: {filename}')

    @transaction.atomic
    def _migrate_schedule(self, schedules_dir: pathlib.Path, format_name: str):
        """
        Migrate a single schedule format to database.

        Creates or updates ScheduleTemplate with slots and update rules.
        """
        # Load schedule JSON
        schedule_data = self._load_schedule_json(schedules_dir, format_name)

        # Parse schedule structure
        num_teams, num_fields, num_groups = self._parse_schedule_metadata(schedule_data)

        # Create or update template
        template, created = ScheduleTemplate.objects.update_or_create(
            name=f'schedule_{format_name}',
            defaults={
                'description': f'Migrated from schedule_{format_name}.json',
                'num_teams': num_teams,
                'num_fields': num_fields,
                'num_groups': num_groups,
                'game_duration': 70,  # Default from ScheduleCreator.DEFAULT_GAME_LENGTH
                'association': None,  # Global template
                'created_by': None,
                'updated_by': None,
            }
        )

        # Delete existing slots and rules (for idempotency)
        template.slots.all().delete()
        template.update_rules.all().delete()

        # Create slots from schedule
        self._create_slots(template, schedule_data)

        # Create update rules from update JSON (if exists)
        self._create_update_rules(schedules_dir, template, format_name)

        return template

    def _load_schedule_json(self, schedules_dir: pathlib.Path, format_name: str) -> List[Dict]:
        """Load and parse schedule JSON file."""
        schedule_file = schedules_dir / f'schedule_{format_name}.json'

        with open(schedule_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _parse_schedule_metadata(self, schedule_data: List[Dict]) -> Tuple[int, int, int]:
        """
        Parse schedule metadata: number of teams, fields, groups.

        Returns: (num_teams, num_fields, num_groups)
        """
        num_fields = len(schedule_data)

        # Infer num_groups from "Gruppe X" standings
        max_group = 0
        for field_entry in schedule_data:
            for game in field_entry.get('games', []):
                if not game:  # Skip empty slots
                    continue

                standing = game.get('standing', '')

                # Check for "Gruppe X" pattern
                match = re.match(r'Gruppe (\d+)', standing)
                if match:
                    group_num = int(match.group(1))
                    max_group = max(max_group, group_num)

        num_groups = max_group if max_group > 0 else 1

        # Infer num_teams from team assignments (group_team indices)
        max_team_count = 0
        teams_per_group = {}

        for field_entry in schedule_data:
            for game in field_entry.get('games', []):
                if not game:  # Skip empty slots
                    continue

                # Check home, away, official for group_team pattern
                for role in ['home', 'away', 'official']:
                    team_str = game.get(role, '')
                    group_idx, team_idx = self._parse_team_assignment(team_str)

                    if group_idx is not None and team_idx is not None:
                        if group_idx not in teams_per_group:
                            teams_per_group[group_idx] = set()
                        teams_per_group[group_idx].add(team_idx)

        # Calculate total teams
        num_teams = sum(len(teams) for teams in teams_per_group.values())

        return num_teams, num_fields, num_groups

    def _parse_team_assignment(self, team_str: str) -> Tuple[Optional[int], Optional[int]]:
        """
        Parse team assignment from string.

        Returns:
            - (group_idx, team_idx) if format is "0_1"
            - (None, None) if it's a reference string like "P1 Gruppe 1"
        """
        # Try to match "0_1" format
        match = re.match(r'^(\d+)_(\d+)$', team_str)
        if match:
            return int(match.group(1)), int(match.group(2))

        return None, None

    def _create_slots(self, template: ScheduleTemplate, schedule_data: List[Dict]):
        """Create TemplateSlot objects from schedule data."""
        for field_entry in schedule_data:
            field_num = int(field_entry['field'])
            games = field_entry.get('games', [])

            for slot_order, game in enumerate(games):
                if not game:  # Empty slot (break)
                    # We could create empty slots or skip them
                    # For now, skip empty slots as they're just time gaps
                    continue

                # Parse team assignments
                home_group, home_team, home_ref = self._parse_team_for_slot(game.get('home', ''))
                away_group, away_team, away_ref = self._parse_team_for_slot(game.get('away', ''))
                official_group, official_team, official_ref = self._parse_team_for_slot(game.get('official', ''))

                # Create slot
                TemplateSlot.objects.create(
                    template=template,
                    field=field_num,
                    slot_order=slot_order,
                    stage=game.get('stage', ''),
                    standing=game.get('standing', ''),
                    home_group=home_group,
                    home_team=home_team,
                    home_reference=home_ref,
                    away_group=away_group,
                    away_team=away_team,
                    away_reference=away_ref,
                    official_group=official_group,
                    official_team=official_team,
                    official_reference=official_ref,
                    break_after=game.get('break_after', 0),
                )

    def _parse_team_for_slot(self, team_str: str) -> Tuple[Optional[int], Optional[int], str]:
        """
        Parse team assignment for slot.

        Returns: (group_idx, team_idx, reference_str)
            - If format is "0_1": returns (0, 1, "")
            - If format is "P1 Gruppe 1": returns (None, None, "P1 Gruppe 1")
        """
        group_idx, team_idx = self._parse_team_assignment(team_str)

        if group_idx is not None and team_idx is not None:
            return group_idx, team_idx, ""
        else:
            return None, None, team_str

    def _create_update_rules(self, schedules_dir: pathlib.Path, template: ScheduleTemplate, format_name: str):
        """Create TemplateUpdateRule objects from update JSON file (if exists)."""
        update_file = schedules_dir / f'update_{format_name}.json'

        if not update_file.exists():
            # No update rules for this format (e.g., simple round-robin)
            return

        with open(update_file, 'r', encoding='utf-8') as f:
            update_data = json.load(f)

        for rule_entry in update_data:
            rule_name = rule_entry['name']
            pre_finished = rule_entry['pre_finished']
            games = rule_entry.get('games', [])

            for game_idx, game in enumerate(games):
                # Find the corresponding slot in the template
                # Slots with this standing name
                slots = template.slots.filter(standing=rule_name)

                if game_idx < slots.count():
                    slot = slots[game_idx]

                    # Create update rule
                    update_rule = TemplateUpdateRule.objects.create(
                        template=template,
                        slot=slot,
                        pre_finished=pre_finished,
                    )

                    # Create team rules for home, away, officials
                    for role in ['home', 'away', 'officials']:
                        team_data = game.get(role)
                        if team_data:
                            self._create_team_rule(update_rule, role, team_data)

    def _create_team_rule(self, update_rule: TemplateUpdateRule, role: str, team_data: Dict):
        """Create TemplateUpdateRuleTeam from team assignment data."""
        # Normalize role name ("officials" -> "official")
        role_normalized = 'official' if role == 'officials' else role

        standing = team_data.get('standing', '')
        place = team_data.get('place', 1)
        points = team_data.get('points')
        pre_finished_override = team_data.get('pre_finished')

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role=role_normalized,
            standing=standing,
            place=place,
            points=points,
            pre_finished_override=pre_finished_override,
        )
