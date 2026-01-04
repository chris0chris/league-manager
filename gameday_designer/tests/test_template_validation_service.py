"""
Test suite for TemplateValidationService.

Following TDD methodology: These tests are written FIRST (RED phase).
Service implementation comes after tests are defined.

Validation Rules Tested:
1. Team count matches num_teams (exact count of unique team placeholders)
2. No scheduling conflicts (team playing multiple games simultaneously)
3. Update rules reference existing standings
4. Field assignments within bounds
5. No self-play (team vs itself)
6. No self-referee (team refs own game)
7. Warning: back-to-back games (team plays then refs immediately after)
"""
import pytest
from django.contrib.auth.models import User

from gamedays.models import Association
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
)
from gameday_designer.service.template_validation_service import (
    TemplateValidationService,
    ValidationResult,
    ValidationError as ServiceValidationError,
)


@pytest.mark.django_db
class TestTemplateValidationServiceTeamCount:
    """Test validation of team count matching."""

    def test_validate_team_count_matches_num_teams(self):
        """Test that template with correct team count validates successfully."""
        template = ScheduleTemplate.objects.create(
            name='6 Team Format',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create slots with exactly 6 unique teams (2 groups × 3 teams each)
        # Group 0: teams 0, 1, 2
        # Group 1: teams 0, 1, 2
        # Important: Use different slot_order for each field to avoid conflicts

        # Field 1 - Group 0 plays
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,  # Group 0 team 2 refs (not playing this slot)
            official_team=2,
        )

        # Field 1 - Group 0 continues
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=1,
            away_group=0,
            away_team=2,
            official_group=0,  # Group 0 team 0 refs
            official_team=0,
        )

        # Field 2 - Group 1 plays (different teams, no overlap with field 1 at same time)
        TemplateSlot.objects.create(
            template=template,
            field=2,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 2',
            home_group=1,
            home_team=0,
            away_group=1,
            away_team=1,
            official_group=1,  # Group 1 team 2 refs
            official_team=2,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_validate_team_count_too_few_teams(self):
        """Test that template with fewer teams than declared fails validation."""
        template = ScheduleTemplate.objects.create(
            name='6 Team Format',
            num_teams=6,  # Declares 6 teams
            num_fields=2,
            num_groups=2,
        )

        # Only create slots with 4 unique teams
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage='Vorrunde',
            standing='Gruppe 2',
            home_group=1,
            home_team=1,
            away_group=1,
            away_team=0,
            official_group=0,
            official_team=1,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        assert len(result.errors) == 1
        assert 'teams' in result.errors[0].message.lower()
        assert 'num_teams' in result.errors[0].field

    def test_validate_team_count_too_many_teams(self):
        """Test that template with more teams than declared fails validation."""
        template = ScheduleTemplate.objects.create(
            name='4 Team Format',
            num_teams=4,  # Declares 4 teams
            num_fields=2,
            num_groups=1,
        )

        # Create slots with 6 unique teams (more than declared)
        for team_idx in range(6):
            TemplateSlot.objects.create(
                template=template,
                field=1,
                slot_order=team_idx,
                stage='Vorrunde',
                standing='Gruppe 1',
                home_group=0,
                home_team=team_idx,
                away_group=0,
                away_team=(team_idx + 1) % 6,
                official_group=0,
                official_team=(team_idx + 2) % 6,
            )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        assert any('teams' in err.message.lower() for err in result.errors)


@pytest.mark.django_db
class TestTemplateValidationServiceSchedulingConflicts:
    """Test validation of scheduling conflicts (simultaneous games)."""

    def test_validate_no_scheduling_conflicts(self):
        """Test that template without conflicts validates successfully."""
        template = ScheduleTemplate.objects.create(
            name='No Conflicts',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            game_duration=70,
        )

        # Team 0_0 plays in slot 0, field 1
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Team 0_0 plays again in slot 1, field 1 (sequential, no conflict)
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=2,
            official_group=1,
            official_team=1,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        # Should not have conflict errors (might have team count warning)
        conflict_errors = [e for e in result.errors if 'conflict' in e.message.lower()]
        assert len(conflict_errors) == 0

    def test_validate_scheduling_conflict_same_slot_different_fields(self):
        """Test that team playing on different fields at same time fails validation."""
        template = ScheduleTemplate.objects.create(
            name='Conflict Test',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            game_duration=70,
        )

        # Team 0_0 plays in slot 0, field 1
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Team 0_0 plays ALSO in slot 0, field 2 (CONFLICT!)
        TemplateSlot.objects.create(
            template=template,
            field=2,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 2',
            home_group=0,
            home_team=0,  # Same team, same slot
            away_group=0,
            away_team=2,
            official_group=1,
            official_team=1,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        conflict_errors = [e for e in result.errors if 'conflict' in e.message.lower()]
        assert len(conflict_errors) >= 1
        assert any('0_0' in err.message for err in conflict_errors)

    def test_validate_official_conflict(self):
        """Test that team refereeing while playing fails validation."""
        template = ScheduleTemplate.objects.create(
            name='Official Conflict',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Team 0_0 plays in slot 0, field 1
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Team 0_0 referees simultaneously in slot 0, field 2 (CONFLICT!)
        TemplateSlot.objects.create(
            template=template,
            field=2,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 2',
            home_group=0,
            home_team=2,
            away_group=1,
            away_team=0,
            official_group=0,  # Team 0_0 as official
            official_team=0,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        conflict_errors = [e for e in result.errors if 'conflict' in e.message.lower()]
        assert len(conflict_errors) >= 1


@pytest.mark.django_db
class TestTemplateValidationServiceUpdateRules:
    """Test validation of update rules."""

    def test_validate_update_rules_reference_existing_standings(self):
        """Test that update rules reference valid standings that exist in template."""
        template = ScheduleTemplate.objects.create(
            name='Update Rules Test',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create preliminary round slots
        prelim_slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Create final round slot
        final_slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage='Finalrunde',
            standing='HF',
            home_reference='P1 Gruppe 1',
            away_reference='P2 Gruppe 1',
            official_reference='P3 Gruppe 1',
        )

        # Create update rule referencing valid standing
        update_rule = TemplateUpdateRule.objects.create(
            template=template,
            slot=final_slot,
            pre_finished='Vorrunde',  # This stage exists
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='home',
            standing='Gruppe 1',  # This standing exists
            place=1,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        # Should not have update rule errors (may have team count warnings)
        update_errors = [e for e in result.errors if 'update rule' in e.message.lower()]
        assert len(update_errors) == 0

    def test_validate_update_rules_invalid_standing_reference(self):
        """Test that update rules referencing non-existent standings fail validation."""
        template = ScheduleTemplate.objects.create(
            name='Invalid Update Rule',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create only Vorrunde slots
        prelim_slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Create final round slot
        final_slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage='Finalrunde',
            standing='HF',
            home_reference='Winner HF',
            away_reference='Winner HF',
            official_reference='Third Place',
        )

        # Create update rule referencing NON-EXISTENT standing
        update_rule = TemplateUpdateRule.objects.create(
            template=template,
            slot=final_slot,
            pre_finished='Vorrunde',
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='home',
            standing='NonExistentStanding',  # Does not exist!
            place=1,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        update_errors = [e for e in result.errors if 'standing' in e.message.lower()]
        assert len(update_errors) >= 1
        assert any('NonExistentStanding' in err.message for err in update_errors)


@pytest.mark.django_db
class TestTemplateValidationServiceFieldBounds:
    """Test validation of field assignments."""

    def test_validate_field_within_bounds(self):
        """Test that all slots use fields within template's num_fields."""
        template = ScheduleTemplate.objects.create(
            name='Field Bounds Test',
            num_teams=6,
            num_fields=2,  # Only fields 1 and 2 allowed
            num_groups=2,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,  # Valid
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        TemplateSlot.objects.create(
            template=template,
            field=2,  # Valid
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 2',
            home_group=1,
            home_team=0,
            away_group=1,
            away_team=1,
            official_group=0,
            official_team=1,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        # Should not have field bound errors (slot.clean() handles this at model level)
        # But service provides additional checks
        field_errors = [e for e in result.errors if 'field' in e.message.lower() and 'exceeds' in e.message.lower()]
        assert len(field_errors) == 0


@pytest.mark.django_db
class TestTemplateValidationServiceSelfPlay:
    """Test validation of self-play prevention (already in model, service confirms)."""

    def test_validate_no_self_play(self):
        """Test that team cannot play against itself (model-level + service-level check)."""
        template = ScheduleTemplate.objects.create(
            name='Self Play Test',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # This should be caught by model validation (slot.clean())
        # Service provides additional layer of validation
        slot = TemplateSlot(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=0,  # Same as home!
            official_group=1,
            official_team=0,
        )

        # Model validation should catch this
        with pytest.raises(Exception):  # ValidationError from model
            slot.full_clean()


@pytest.mark.django_db
class TestTemplateValidationServiceBackToBack:
    """Test warning for back-to-back games (team plays then refs immediately)."""

    def test_validate_warn_back_to_back_play_then_ref(self):
        """Test that team playing then refereeing immediately generates warning."""
        template = ScheduleTemplate.objects.create(
            name='Back to Back Test',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Team 0_0 plays in slot 0
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,  # Team 0_0 plays
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        # Team 0_0 refs in slot 1 (immediately after)
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=1,
            away_group=0,
            away_team=2,
            official_group=0,
            official_team=0,  # Team 0_0 refs (back-to-back)
        )

        service = TemplateValidationService(template)
        result = service.validate()

        # Should generate WARNING (not error)
        assert len(result.warnings) >= 1
        assert any('back-to-back' in w.message.lower() or 'consecutive' in w.message.lower() for w in result.warnings)


@pytest.mark.django_db
class TestTemplateValidationServiceComprehensive:
    """Test comprehensive validation scenarios."""

    def test_validate_returns_multiple_errors(self):
        """Test that validation returns all errors, not just first one."""
        template = ScheduleTemplate.objects.create(
            name='Multiple Errors',
            num_teams=6,  # Will have wrong count
            num_fields=2,
            num_groups=2,
        )

        # Only 2 teams used (wrong count)
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=0,  # Self-referee (caught by model)
        )

        # Same slot on different field (conflict)
        TemplateSlot.objects.create(
            template=template,
            field=2,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 2',
            home_group=0,
            home_team=0,  # Conflict: team 0_0 plays simultaneously
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        # Should have multiple errors
        assert len(result.errors) >= 2

    def test_validate_empty_template(self):
        """Test validation of template with no slots."""
        template = ScheduleTemplate.objects.create(
            name='Empty Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # No slots created

        service = TemplateValidationService(template)
        result = service.validate()

        assert result.is_valid is False
        # Should have error about missing slots or team count mismatch
        assert len(result.errors) >= 1

    def test_validation_result_structure(self):
        """Test that ValidationResult has correct structure."""
        template = ScheduleTemplate.objects.create(
            name='Structure Test',
            num_teams=4,
            num_fields=1,
            num_groups=1,
        )

        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Round Robin',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )

        service = TemplateValidationService(template)
        result = service.validate()

        # Check result has expected attributes
        assert hasattr(result, 'is_valid')
        assert hasattr(result, 'errors')
        assert hasattr(result, 'warnings')
        assert isinstance(result.is_valid, bool)
        assert isinstance(result.errors, list)
        assert isinstance(result.warnings, list)

        # Check error/warning structure
        for err in result.errors:
            assert hasattr(err, 'field')
            assert hasattr(err, 'message')
            assert hasattr(err, 'severity')
            assert err.severity == 'error'

        for warn in result.warnings:
            assert hasattr(warn, 'field')
            assert hasattr(warn, 'message')
            assert hasattr(warn, 'severity')
            assert warn.severity == 'warning'
