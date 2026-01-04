"""
Template Application Service.

Applies schedule templates to gamedays, creating Gameinfo and Gameresult objects.
Implements atomic transaction for data integrity.

This is the GREEN phase of TDD - implementing service to make tests pass.
"""
from dataclasses import dataclass, field
from typing import Dict, Optional, Set, Tuple
import datetime

from django.db import transaction
from django.contrib.auth.models import User

from gamedays.models import Gameday, Team, Gameinfo, Gameresult
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication


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
        applied_by: Optional[User] = None
    ):
        """
        Initialize application service.

        Args:
            template: The ScheduleTemplate to apply
            gameday: The Gameday to apply template to
            team_mapping: Dictionary mapping placeholder (e.g., '0_0') to team ID
            applied_by: User applying the template (optional, for audit trail)
        """
        self.template = template
        self.gameday = gameday
        self.team_mapping = team_mapping
        self.applied_by = applied_by

    @transaction.atomic
    def apply(self) -> ApplicationResult:
        """
        Apply template to gameday (atomic operation).

        Returns:
            ApplicationResult with success status and details

        Raises:
            ApplicationError: If validation fails or application encounters error
        """
        # Step 1: Validate compatibility
        self._validate_compatibility()

        # Step 2: Clear existing schedule
        self._clear_existing_schedule()

        # Step 3: Create gameinfos from slots
        gameinfos = self._create_gameinfos()

        # Step 4: Create gameresults for each gameinfo
        self._create_gameresults(gameinfos)

        # Step 5: Store audit trail
        self._create_audit_record()

        return ApplicationResult(
            success=True,
            gameinfos_created=len(gameinfos),
            message=f'Successfully applied template "{self.template.name}" to gameday "{self.gameday.name}". Created {len(gameinfos)} games.'
        )

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
            gameday_fields = int(self.gameday.format.split('_')[1])
        except (ValueError, IndexError):
            # If we can't parse, assume it's okay (backward compatibility)
            gameday_fields = max_field_used

        if max_field_used > gameday_fields:
            raise ApplicationError(
                f'Template requires field {max_field_used} but gameday only has {gameday_fields} fields'
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
                    f'Team with ID {team_id} (for placeholder {placeholder}) does not exist'
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
                placeholders.add(f'{slot.home_group}_{slot.home_team}')

            # Add away team placeholder
            if slot.away_group is not None and slot.away_team is not None:
                placeholders.add(f'{slot.away_group}_{slot.away_team}')

            # Add official team placeholder
            if slot.official_group is not None and slot.official_team is not None:
                placeholders.add(f'{slot.official_group}_{slot.official_team}')

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

        Returns:
            List of created Gameinfo objects
        """
        gameinfos = []
        slots = self.template.slots.all().order_by('field', 'slot_order')

        # Track last scheduled time per field
        field_times: Dict[int, datetime.time] = {}

        for slot in slots:
            # Calculate scheduled time
            scheduled = self._calculate_scheduled_time(slot, field_times)
            field_times[slot.field] = scheduled

            # Resolve official team
            official_team = self._resolve_team_placeholder(
                slot.official_group,
                slot.official_team,
                slot.official_reference
            )

            # Create Gameinfo
            gameinfo = Gameinfo.objects.create(
                gameday=self.gameday,
                scheduled=scheduled,
                field=slot.field,
                stage=slot.stage,
                standing=slot.standing,
                officials=official_team,
                status='Geplant',
            )

            gameinfos.append(gameinfo)

        return gameinfos

    def _calculate_scheduled_time(
        self,
        slot: TemplateSlot,
        field_times: Dict[int, datetime.time]
    ) -> datetime.time:
        """
        Calculate scheduled time for a slot.

        For the first slot on a field, use gameday start time.
        For subsequent slots, add game_duration + break_after from previous slot.

        Args:
            slot: The TemplateSlot to schedule
            field_times: Dictionary tracking last scheduled time per field

        Returns:
            Scheduled time as datetime.time
        """
        if slot.field not in field_times:
            # First slot on this field - use gameday start time
            return self.gameday.start

        # Get previous slot's end time
        prev_time = field_times[slot.field]

        # Get previous slot to check break_after
        prev_slots = self.template.slots.filter(
            field=slot.field,
            slot_order=slot.slot_order - 1
        )

        if prev_slots.exists():
            prev_slot = prev_slots.first()
            break_minutes = prev_slot.break_after
        else:
            break_minutes = 0

        # Calculate new time: previous time + game duration + break
        total_minutes = self.template.game_duration + break_minutes

        # Convert time to datetime, add minutes, convert back to time
        prev_datetime = datetime.datetime.combine(datetime.date.today(), prev_time)
        new_datetime = prev_datetime + datetime.timedelta(minutes=total_minutes)

        return new_datetime.time()

    def _resolve_team_placeholder(
        self,
        group: Optional[int],
        team: Optional[int],
        reference: Optional[str]
    ) -> Optional[Team]:
        """
        Resolve team from placeholder or reference.

        Args:
            group: Group index (0-based)
            team: Team index within group (0-based)
            reference: Reference string (e.g., "Gewinner HF1") for final rounds

        Returns:
            Team object if resolved, None if reference (to be determined later)
        """
        if reference:
            # This is a final round game, team will be determined later
            # For now, return None (would be handled by update rules in actual game flow)
            return None

        if group is not None and team is not None:
            placeholder = f'{group}_{team}'
            team_id = self.team_mapping.get(placeholder)

            if team_id:
                try:
                    return Team.objects.get(pk=team_id)
                except Team.DoesNotExist:
                    raise ApplicationError(
                        f'Team with ID {team_id} (placeholder {placeholder}) does not exist'
                    )

        return None

    def _create_gameresults(self, gameinfos: list):
        """
        Create Gameresult objects for each Gameinfo.

        Each gameinfo gets two Gameresult objects: home team and away team.

        Args:
            gameinfos: List of Gameinfo objects
        """
        slots = self.template.slots.all().order_by('field', 'slot_order')

        for gameinfo, slot in zip(gameinfos, slots):
            # Resolve home team
            home_team = self._resolve_team_placeholder(
                slot.home_group,
                slot.home_team,
                slot.home_reference
            )

            # Resolve away team
            away_team = self._resolve_team_placeholder(
                slot.away_group,
                slot.away_team,
                slot.away_reference
            )

            # Create home Gameresult
            if home_team:
                Gameresult.objects.create(
                    gameinfo=gameinfo,
                    team=home_team,
                    isHome=True,
                    fh=None,  # To be filled in during game
                    sh=None,
                    pa=None,
                )

            # Create away Gameresult
            if away_team:
                Gameresult.objects.create(
                    gameinfo=gameinfo,
                    team=away_team,
                    isHome=False,
                    fh=None,
                    sh=None,
                    pa=None,
                )

    def _create_audit_record(self):
        """
        Create TemplateApplication audit record.

        Records when template was applied, by whom, and team mapping used.
        """
        TemplateApplication.objects.create(
            template=self.template,
            gameday=self.gameday,
            applied_by=self.applied_by,
            team_mapping=self.team_mapping,
        )
