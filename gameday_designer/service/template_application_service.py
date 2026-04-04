"""
Template Application Service.

Applies schedule templates to gamedays, creating Gameinfo and Gameresult objects.
Implements atomic transaction for data integrity.

This is the GREEN phase of TDD - implementing service to make tests pass.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional, Set, Tuple
import datetime

from django.db import transaction
from django.contrib.auth.models import User

from gamedays.models import Gameday, Team, Gameinfo, Gameresult
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication
from gameday_designer.service.time_service import TimeService


class ApplicationError(Exception):
    """Exception raised when template application fails."""

    pass


@dataclass
class ApplicationResult:
    """
    Result of template application.

    Attributes:
        success: True if application succeeded
        gameinfos_created: Number of Gameinfo objects created
        message: Human-readable status message
    """

    success: bool
    gameinfos_created: int = 0
    message: str = ""


class TemplateApplicationService:
    """
    Applies schedule templates to gamedays.

    Process (atomic transaction):
    1. Validate compatibility (team mapping complete, teams exist, gameday has enough fields)
    2. Clear existing gameday schedule
    3. Create Gameinfo objects from template slots
    4. Create Gameresult objects (home/away teams)
    5. Create TemplateApplication audit record

    Usage:
        service = TemplateApplicationService(template, gameday, team_mapping, applied_by=user)
        result = service.apply()
    """

    def __init__(
        self,
        template: ScheduleTemplate,
        gameday: Gameday,
        team_mapping: Dict[str, int],
        applied_by: Optional[User] = None,
        *,
        start_time=None,
        game_duration=None,
        break_duration=None,
        num_fields=None,
    ):
        """
        Initialize application service.

        Args:
            template: The ScheduleTemplate to apply
            gameday: The Gameday to apply template to
            team_mapping: Dictionary mapping placeholder (e.g., '0_0') to team ID
            applied_by: User applying the template (optional, for audit trail)
            start_time: Override gameday start time (keyword-only, optional)
            game_duration: Override template game duration in minutes (keyword-only, optional)
            break_duration: Additional break duration to add after each slot (keyword-only, optional)
            num_fields: Override number of fields, redistributing slots round-robin (keyword-only, optional)
        """
        self.template = template
        self.gameday = gameday
        self.team_mapping = team_mapping
        self.applied_by = applied_by
        self.start_time = start_time
        self.game_duration = game_duration
        self.break_duration = break_duration
        self.num_fields = num_fields
        self._ordered_slots = None

    def apply(self) -> ApplicationResult:
        """
        Apply template to gameday (atomic operation).

        Returns:
            ApplicationResult with success status and details

        Raises:
            ApplicationError: If validation fails or application encounters error
        """
        with transaction.atomic():
            # Step 1: Validate compatibility
            self._validate_compatibility()

            # Step 2: Clear existing schedule
            self._clear_existing_schedule()

            # Step 3: Create gameinfos from slots
            gameinfos = self._create_gameinfos()

            # Step 4: Resolve ranking-based references
            self._resolve_ranking_references()

            # Step 5: Create gameresults for each gameinfo
            self._create_gameresults(gameinfos)

            # Step 6: Store audit trail
            application = self._create_audit_record()

            return ApplicationResult(
                success=True,
                gameinfos_created=len(gameinfos),
                message=f'Successfully applied template "{self.template.name}" to gameday "{self.gameday.name}". Created {len(gameinfos)} games.',
            )

    def _resolve_ranking_references(self):
        """
        Identify Ranking Stages and resolve their outcomes into the team mapping.

        This allows slots referencing "Rank X StageY" to be resolved into concrete team IDs
        at the time of application.
        """
        # 1. Group slots by stage
        stages_map = {}
        for slot in self.template.slots.all():
            if slot.stage not in stages_map:
                stages_map[slot.stage] = []
            stages_map[slot.stage].append(slot)

        # 2. For each Ranking Stage, calculate "pseudo-standings" based on the mapping
        for stage_name, slots in stages_map.items():
            # Check if this stage is a Ranking Stage
            # (In our model, stage_type is on the slot level)
            if any(slot.stage_type == "RANKING" for slot in slots):
                self._calculate_and_map_rankings(stage_name, slots)

    def _calculate_and_map_rankings(self, stage_name: str, slots: list[TemplateSlot]):
        """
        Calculate the ranking for a stage and add to team_mapping.

        Note: Since games haven't been played yet, we "rank" based on the team mapping
        order (Preliminary rank). In a real gameday, this will be handled by UpdateRules.
        For static application, we just provide the mapping so the games can be created.
        """
        # Extract all unique teams assigned to this stage via mapping
        participants = set()
        for slot in slots:
            home = (
                f"{slot.home_group}_{slot.home_team}"
                if slot.home_group is not None
                else None
            )
            away = (
                f"{slot.away_group}_{slot.away_team}"
                if slot.away_group is not None
                else None
            )
            if home and home in self.team_mapping:
                participants.add(self.team_mapping[home])
            if away and away in self.team_mapping:
                participants.add(self.team_mapping[away])

        # Sort participants to create a deterministic ranking
        # (Matches the logic in frontend rankingEngine.ts)
        ordered_teams = sorted(list(participants))

        # Add to mapping: "Rank X StageName" -> team_id
        for i, team_id in enumerate(ordered_teams):
            rank_key = f"Rank {i+1} {stage_name}"
            self.team_mapping[rank_key] = team_id

    def _validate_compatibility(self):
        """
        Validate that template can be applied to gameday.

        Checks:
        - All teams in mapping exist in database
        - All required team placeholders have mappings
        - Gameday has enough fields for template

        Raises:
            ApplicationError: If validation fails
        """
        # Check gameday has enough fields
        # Note: We need to check the actual maximum field used in slots
        slots = self.template.slots.all()
        if not slots.exists():
            raise ApplicationError("Template has no slots defined")

        max_field_used = max(slot.field for slot in slots)
        # We don't have num_fields on Gameday model, so we infer from format
        # Format is like "6_2" where 2 is number of fields
        try:
            gameday_fields = int(self.gameday.format.split("_")[1])
        except (ValueError, IndexError):
            # If we can't parse, assume it's okay (backward compatibility)
            gameday_fields = max_field_used

        # When num_fields override is set, slots will be redistributed round-robin so
        # the original field assignments are irrelevant — skip the fields check.
        if self.num_fields is None and max_field_used > gameday_fields:
            raise ApplicationError(
                f"Template requires field {max_field_used} but gameday only has {gameday_fields} fields"
            )

        # Get required team placeholders from slots
        required_placeholders = self._get_required_team_placeholders()

        # Check all required placeholders have mappings
        provided_placeholders = set(self.team_mapping.keys())
        missing_placeholders = required_placeholders - provided_placeholders

        if missing_placeholders:
            raise ApplicationError(
                f'Incomplete team mapping. Missing placeholders: {", ".join(sorted(missing_placeholders))}'
            )

        # Check all mapped teams exist
        for placeholder, team_id in self.team_mapping.items():
            if not Team.objects.filter(pk=team_id).exists():
                raise ApplicationError(
                    f"Team with ID {team_id} (for placeholder {placeholder}) does not exist"
                )

    def _get_required_team_placeholders(self) -> Set[str]:
        """
        Get set of required team placeholders from template slots.

        Returns:
            Set of placeholder strings (e.g., {'0_0', '0_1', '1_0', ...})
        """
        placeholders = set()
        slots = self.template.slots.all()

        for slot in slots:
            # Add home team placeholder (if not a reference)
            if slot.home_group is not None and slot.home_team is not None:
                placeholders.add(f"{slot.home_group}_{slot.home_team}")

            # Add away team placeholder
            if slot.away_group is not None and slot.away_team is not None:
                placeholders.add(f"{slot.away_group}_{slot.away_team}")

            # Add official team placeholder
            if slot.official_group is not None and slot.official_team is not None:
                placeholders.add(f"{slot.official_group}_{slot.official_team}")

        return placeholders

    def _clear_existing_schedule(self):
        """
        Clear existing Gameinfo objects from gameday.

        This deletes all Gameinfo objects associated with the gameday.
        Gameresult objects are cascade-deleted automatically.
        """
        Gameinfo.objects.filter(gameday=self.gameday).delete()

    def _create_gameinfos(self) -> list:
        """
        Create Gameinfo objects from template slots.

        When num_fields override is set, all template slots are fetched ordered by
        (field, slot_order) and redistributed round-robin across effective_fields.
        Otherwise the original per-field ordering is used.

        Returns:
            List of created Gameinfo objects
        """
        gameinfos = []

        effective_start = self.start_time or self.gameday.start
        effective_duration = self.game_duration or self.template.game_duration
        effective_fields = self.num_fields or self.template.num_fields

        if self.num_fields is not None:
            # Redistribution mode: assign slots round-robin across effective_fields
            all_slots = list(
                self.template.slots.all().order_by("field", "slot_order")
            )

            # Store ordered slots for _create_gameresults to reuse
            self._ordered_slots = all_slots

            # Assign effective field numbers round-robin
            for i, slot in enumerate(all_slots):
                slot._effective_field = (i % effective_fields) + 1

            # Group by effective field for per-field time calculation
            field_groups: dict = defaultdict(list)
            for slot in all_slots:
                field_groups[slot._effective_field].append(slot)

            # Build a flat ordered list matching the final gameinfos order
            # We process fields in order 1..effective_fields, matching slot assignment
            for field_num in range(1, effective_fields + 1):
                slots = field_groups.get(field_num, [])
                if not slots:
                    continue

                slot_data = [
                    {"break_after": s.break_after + (self.break_duration or 0)}
                    for s in slots
                ]
                start_times = TimeService.calculate_game_times(
                    effective_start, effective_duration, slot_data
                )

                for slot, scheduled in zip(slots, start_times):
                    official_team = self._resolve_team_placeholder(
                        slot.official_group, slot.official_team, slot.official_reference
                    )
                    gameinfo = Gameinfo.objects.create(
                        gameday=self.gameday,
                        scheduled=scheduled,
                        field=slot._effective_field,
                        stage=slot.stage,
                        standing=slot.standing,
                        officials=official_team,
                        status="Geplant",
                    )
                    gameinfos.append(gameinfo)
        else:
            # Standard mode: process each original field independently
            self._ordered_slots = None  # Not needed; _create_gameresults uses default order

            for field_num in range(1, self.template.num_fields + 1):
                slots = list(
                    self.template.slots.filter(field=field_num).order_by("slot_order")
                )
                if not slots:
                    continue

                slot_data = [
                    {"break_after": s.break_after + (self.break_duration or 0)}
                    for s in slots
                ]
                start_times = TimeService.calculate_game_times(
                    effective_start, effective_duration, slot_data
                )

                for slot, scheduled in zip(slots, start_times):
                    official_team = self._resolve_team_placeholder(
                        slot.official_group, slot.official_team, slot.official_reference
                    )
                    gameinfo = Gameinfo.objects.create(
                        gameday=self.gameday,
                        scheduled=scheduled,
                        field=slot.field,
                        stage=slot.stage,
                        standing=slot.standing,
                        officials=official_team,
                        status="Geplant",
                    )
                    gameinfos.append(gameinfo)

        return gameinfos

    def _resolve_team_placeholder(
        self, group: Optional[int], team: Optional[int], reference: Optional[str]
    ) -> Optional[Team]:
        """
        Resolve team from placeholder or reference.

        Args:
            group: Group index (0-based)
            team: Team index within group (0-based)
            reference: Reference string (e.g., "Gewinner HF1", "Rank 1 Preliminary") for final rounds

        Returns:
            Team object if resolved, None if reference (to be determined later)
        """
        if reference:
            # Check if this is a resolvable rank reference
            if reference in self.team_mapping:
                team_id = self.team_mapping[reference]
                try:
                    return Team.objects.get(pk=team_id)
                except Team.DoesNotExist:
                    raise ApplicationError(
                        f"Team with ID {team_id} (referenced as {reference}) does not exist"
                    )

            # This is a final round game (winner/loser), team will be determined later
            # For now, return None (would be handled by update rules in actual game flow)
            return None

        if group is not None and team is not None:
            placeholder = f"{group}_{team}"
            team_id = self.team_mapping.get(placeholder)

            if team_id:
                try:
                    return Team.objects.get(pk=team_id)
                except Team.DoesNotExist:
                    raise ApplicationError(
                        f"Team with ID {team_id} (placeholder {placeholder}) does not exist"
                    )

        return None

    def _create_gameresults(self, gameinfos: list):
        """
        Create Gameresult objects for each Gameinfo.

        Each gameinfo gets two Gameresult objects: home team and away team.

        When num_fields redistribution was used in _create_gameinfos(), the gameinfos
        are ordered by (effective_field, slot_in_that_field). We must pair them with
        slots in the same order. _create_gameinfos() stores the redistributed slot list
        grouped by effective field in self._ordered_slots; we rebuild that same ordering
        here by re-grouping from self._ordered_slots.

        Args:
            gameinfos: List of Gameinfo objects
        """
        if self.num_fields is not None and self._ordered_slots is not None:
            effective_fields = self.num_fields
            ordered_slots_for_zip = [s for fn in range(1, effective_fields + 1)
                                     for s in self._ordered_slots if s._effective_field == fn]
        else:
            ordered_slots_for_zip = list(self.template.slots.all().order_by("field", "slot_order"))
        for gameinfo, slot in zip(gameinfos, ordered_slots_for_zip):
            # Resolve home team
            home_team = self._resolve_team_placeholder(
                slot.home_group, slot.home_team, slot.home_reference
            )

            # Resolve away team
            away_team = self._resolve_team_placeholder(
                slot.away_group, slot.away_team, slot.away_reference
            )

            # Create home Gameresult
            Gameresult.objects.create(
                gameinfo=gameinfo,
                team=home_team,
                isHome=True,
                fh=None,  # To be filled in during game
                sh=None,
                pa=None,
            )

            # Create away Gameresult
            Gameresult.objects.create(
                gameinfo=gameinfo,
                team=away_team,
                isHome=False,
                fh=None,  # To be filled in during game
                sh=None,
                pa=None,
            )

    def _create_audit_record(self):
        """
        Create TemplateApplication audit record.

        Records when template was applied, by whom, and team mapping used.
        """
        return TemplateApplication.objects.create(
            template=self.template,
            gameday=self.gameday,
            applied_by=self.applied_by,
            team_mapping=self.team_mapping,
        )
