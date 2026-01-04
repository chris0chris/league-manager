"""
Template Validation Service.

Validates template consistency and correctness following business rules.
Implements comprehensive validation checks for schedule templates.

This is the GREEN phase of TDD - implementing service to make tests pass.
"""
from dataclasses import dataclass, field
from typing import List, Set, Dict, Tuple

from gameday_designer.models import ScheduleTemplate, TemplateSlot


@dataclass
class ValidationError:
    """
    Represents a validation error or warning.

    Attributes:
        field: The field or area where error occurred
        message: Human-readable error message
        severity: 'error' (blocks validation) or 'warning' (informational)
    """
    field: str
    message: str
    severity: str = 'error'


@dataclass
class ValidationResult:
    """
    Result of template validation.

    Attributes:
        is_valid: True if no errors (warnings don't block)
        errors: List of validation errors (block success)
        warnings: List of validation warnings (informational)
    """
    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)


class TemplateValidationService:
    """
    Validates schedule template consistency and correctness.

    Validation Rules:
    1. Team count matches num_teams (exact count of unique team placeholders)
    2. No scheduling conflicts (team playing multiple games simultaneously)
    3. Update rules reference existing standings
    4. Field assignments within bounds (handled by model, verified here)
    5. No self-play, no self-referee (handled by model, verified here)
    6. Warning: back-to-back games (team plays then referees immediately)
    """

    def __init__(self, template: ScheduleTemplate):
        """
        Initialize validation service for a template.

        Args:
            template: The ScheduleTemplate to validate
        """
        self.template = template

    def validate(self) -> ValidationResult:
        """
        Run all validation checks on the template.

        Returns:
            ValidationResult with is_valid, errors, and warnings
        """
        errors: List[ValidationError] = []
        warnings: List[ValidationError] = []

        # Run all validation checks
        errors.extend(self._validate_team_count())
        errors.extend(self._validate_scheduling_conflicts())
        errors.extend(self._validate_update_rules())
        errors.extend(self._validate_field_bounds())

        # Warnings don't block validation
        warnings.extend(self._validate_back_to_back())

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _validate_team_count(self) -> List[ValidationError]:
        """
        Validate that num_teams matches actual team placeholders in slots.

        Counts unique team placeholders (group_team combinations) across all slots.
        Does not count reference placeholders (those are determined dynamically).

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        slots = self.template.slots.all()
        if not slots.exists():
            errors.append(ValidationError(
                field='slots',
                message='Template has no slots defined',
                severity='error'
            ))
            return errors

        unique_teams = self._count_unique_teams(slots)

        if unique_teams != self.template.num_teams:
            errors.append(ValidationError(
                field='num_teams',
                message=f'Template declares {self.template.num_teams} teams but slots reference {unique_teams} unique teams',
                severity='error'
            ))

        return errors

    def _count_unique_teams(self, slots) -> int:
        """
        Count unique team placeholders across all slots.

        Args:
            slots: QuerySet of TemplateSlot objects

        Returns:
            Count of unique teams (group_team combinations)
        """
        unique_teams: Set[Tuple[int, int]] = set()

        for slot in slots:
            # Count home team if not a reference
            if slot.home_group is not None and slot.home_team is not None:
                unique_teams.add((slot.home_group, slot.home_team))

            # Count away team if not a reference
            if slot.away_group is not None and slot.away_team is not None:
                unique_teams.add((slot.away_group, slot.away_team))

            # Count official team if not a reference
            if slot.official_group is not None and slot.official_team is not None:
                unique_teams.add((slot.official_group, slot.official_team))

        return len(unique_teams)

    def _validate_scheduling_conflicts(self) -> List[ValidationError]:
        """
        Validate that no team plays or referees multiple games simultaneously.

        A scheduling conflict occurs when:
        - Same team (group_team) is in multiple slots with same slot_order
        - Team cannot be in two places at once

        Returns:
            List of validation errors
        """
        errors = []

        slots = self.template.slots.all().order_by('field', 'slot_order')

        # Group slots by slot_order (slots with same order are simultaneous)
        slots_by_order: Dict[int, List[TemplateSlot]] = {}
        for slot in slots:
            if slot.slot_order not in slots_by_order:
                slots_by_order[slot.slot_order] = []
            slots_by_order[slot.slot_order].append(slot)

        # Check each time slot for conflicts
        for slot_order, simultaneous_slots in slots_by_order.items():
            if len(simultaneous_slots) <= 1:
                continue  # No conflict possible with only one slot

            # Track which teams are busy in this time slot
            teams_in_slot: Dict[Tuple[int, int], List[str]] = {}

            for slot in simultaneous_slots:
                # Check home team
                if slot.home_group is not None and slot.home_team is not None:
                    team_id = (slot.home_group, slot.home_team)
                    if team_id not in teams_in_slot:
                        teams_in_slot[team_id] = []
                    teams_in_slot[team_id].append(f'Field {slot.field} home')

                # Check away team
                if slot.away_group is not None and slot.away_team is not None:
                    team_id = (slot.away_group, slot.away_team)
                    if team_id not in teams_in_slot:
                        teams_in_slot[team_id] = []
                    teams_in_slot[team_id].append(f'Field {slot.field} away')

                # Check official team
                if slot.official_group is not None and slot.official_team is not None:
                    team_id = (slot.official_group, slot.official_team)
                    if team_id not in teams_in_slot:
                        teams_in_slot[team_id] = []
                    teams_in_slot[team_id].append(f'Field {slot.field} official')

            # Report conflicts
            for team_id, roles in teams_in_slot.items():
                if len(roles) > 1:
                    team_name = f'{team_id[0]}_{team_id[1]}'
                    errors.append(ValidationError(
                        field=f'slot_order_{slot_order}',
                        message=f'Scheduling conflict: Team {team_name} assigned to multiple roles in slot {slot_order}: {", ".join(roles)}',
                        severity='error'
                    ))

        return errors

    def _validate_update_rules(self) -> List[ValidationError]:
        """
        Validate that update rules reference existing standings.

        Each TemplateUpdateRuleTeam must reference a standing that exists
        in the template's slots.

        Returns:
            List of validation errors
        """
        errors = []

        # Get all standings present in template
        slots = self.template.slots.all()
        available_standings = set(slot.standing for slot in slots)

        # Check each update rule's team rules
        update_rules = self.template.update_rules.all()
        for update_rule in update_rules:
            team_rules = update_rule.team_rules.all()
            for team_rule in team_rules:
                if team_rule.standing not in available_standings:
                    errors.append(ValidationError(
                        field=f'update_rule_{update_rule.pk}',
                        message=f'Update rule references non-existent standing: "{team_rule.standing}". Available standings: {", ".join(sorted(available_standings))}',
                        severity='error'
                    ))

        return errors

    def _validate_field_bounds(self) -> List[ValidationError]:
        """
        Validate that all field assignments are within template's num_fields.

        This is also enforced at model level, but service provides additional check.

        Returns:
            List of validation errors
        """
        errors = []

        slots = self.template.slots.all()
        for slot in slots:
            if slot.field > self.template.num_fields:
                errors.append(ValidationError(
                    field=f'slot_{slot.pk}',
                    message=f'Slot uses field {slot.field} which exceeds template num_fields {self.template.num_fields}',
                    severity='error'
                ))

        return errors

    def _validate_back_to_back(self) -> List[ValidationError]:
        """
        Warn about back-to-back games (team plays then refs immediately after).

        This is a WARNING, not an error - it's allowed but may not be ideal.

        Returns:
            List of validation warnings
        """
        warnings = []

        # Group slots by field and slot_order
        slots = self.template.slots.all().order_by('field', 'slot_order')

        # Check each field separately (back-to-back only on same field)
        fields: Dict[int, List[TemplateSlot]] = {}
        for slot in slots:
            if slot.field not in fields:
                fields[slot.field] = []
            fields[slot.field].append(slot)

        for field_num, field_slots in fields.items():
            # Check consecutive slots
            for i in range(len(field_slots) - 1):
                current_slot = field_slots[i]
                next_slot = field_slots[i + 1]

                # Get teams playing in current slot
                current_players = set()
                if current_slot.home_group is not None and current_slot.home_team is not None:
                    current_players.add((current_slot.home_group, current_slot.home_team))
                if current_slot.away_group is not None and current_slot.away_team is not None:
                    current_players.add((current_slot.away_group, current_slot.away_team))

                # Check if any of those teams ref next slot
                if next_slot.official_group is not None and next_slot.official_team is not None:
                    official_team = (next_slot.official_group, next_slot.official_team)
                    if official_team in current_players:
                        team_name = f'{official_team[0]}_{official_team[1]}'
                        warnings.append(ValidationError(
                            field=f'field_{field_num}',
                            message=f'Back-to-back assignment: Team {team_name} plays in slot {current_slot.slot_order} then refs slot {next_slot.slot_order} on field {field_num}',
                            severity='warning'
                        ))

        return warnings
