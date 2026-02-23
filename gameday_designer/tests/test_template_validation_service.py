"""
Tests for Template Validation Service.
"""

import pytest
from gameday_designer.models import ScheduleTemplate, TemplateSlot
from gameday_designer.service.template_validation_service import (
    TemplateValidationService,
)


@pytest.mark.django_db
class TestTemplateValidationService:
    def test_validate_success(self):
        template = ScheduleTemplate.objects.create(
            name="Valid Template", num_fields=1, num_teams=4, game_duration=60
        )
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Vorrunde",
            standing="Game 1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
        )

        service = TemplateValidationService(template)
        is_valid, errors, warnings = service.validate()

        assert is_valid is True
        assert len(errors) == 0
        assert len(warnings) == 0

    def test_validate_incomplete_inputs(self):
        template = ScheduleTemplate.objects.create(
            name="Incomplete Template", num_fields=1, num_teams=4, game_duration=60
        )
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Vorrunde",
            standing="Game 1",
            home_group=0,
            home_team=0,  # Missing away
        )

        service = TemplateValidationService(template)
        is_valid, errors, _ = service.validate()

        assert is_valid is False
        assert any(e.type == "incomplete_game_inputs" for e in errors)

    def test_validate_circular_dependency(self):
        template = ScheduleTemplate.objects.create(
            name="Circular Template", num_fields=1, num_teams=4, game_duration=60
        )
        # Game 1 -> depends on Game 2
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Finals",
            standing="Game 1",
            home_reference="Gewinner Game 2",
            away_group=0,
            away_team=0,
        )
        # Game 2 -> depends on Game 1
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=2,
            stage="Finals",
            standing="Game 2",
            home_reference="Gewinner Game 1",
            away_group=0,
            away_team=1,
        )

        service = TemplateValidationService(template)
        is_valid, errors, _ = service.validate()

        assert is_valid is False
        assert any(e.type == "circular_dependency" for e in errors)

    def test_validate_official_playing(self):
        template = ScheduleTemplate.objects.create(
            name="Official Playing", num_fields=1, num_teams=4, game_duration=60
        )
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Vorrunde",
            standing="Game 1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=0,  # Official is Home team
        )

        service = TemplateValidationService(template)
        is_valid, errors, _ = service.validate()

        assert is_valid is False
        assert any(e.type == "official_playing" for e in errors)

    def test_validate_duplicate_standings(self):
        template = ScheduleTemplate.objects.create(
            name="Duplicate Standings", num_fields=1, num_teams=4, game_duration=60
        )
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Vorrunde",
            standing="Game 1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
        )
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=2,
            stage="Vorrunde",
            standing="Game 1",
            home_group=0,
            home_team=2,
            away_group=0,
            away_team=3,
        )

        service = TemplateValidationService(template)
        is_valid, _, warnings = service.validate()

        assert is_valid is True  # Duplicate standing is only a warning
        assert any(w.type == "duplicate_standing" for w in warnings)
