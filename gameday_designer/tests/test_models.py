"""
Test suite for gameday_designer models.

Following TDD methodology: These tests are written FIRST before model implementation.
All tests should initially FAIL (RED phase), then we implement models to make them PASS (GREEN phase).
"""
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth.models import User

from gamedays.models import Association
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
    TemplateApplication,
)


@pytest.mark.django_db
class TestScheduleTemplate:
    """Test ScheduleTemplate model - reusable tournament schedule templates."""

    def test_create_global_template(self):
        """Test creating a global template (association=None)."""
        user = User.objects.create(username='admin', is_staff=True)
        template = ScheduleTemplate.objects.create(
            name='6 Teams 2 Groups',
            description='Standard 6-team format with 2 groups',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            game_duration=70,
            association=None,
            created_by=user,
            updated_by=user,
        )

        assert template.pk is not None
        assert template.name == '6 Teams 2 Groups'
        assert template.association is None
        assert template.created_by == user
        assert template.created_at is not None
        assert template.updated_at is not None

    def test_create_association_template(self):
        """Test creating an association-specific template."""
        user = User.objects.create(username='admin')
        association = Association.objects.create(abbr='DFFL', name='Deutsche Flag Football Liga')

        template = ScheduleTemplate.objects.create(
            name='DFFL Special Format',
            num_teams=8,
            num_fields=3,
            num_groups=2,
            association=association,
            created_by=user,
        )

        assert template.association == association
        assert template.name == 'DFFL Special Format'

    def test_unique_constraint_name_per_association(self):
        """Test that template names must be unique within an association."""
        association = Association.objects.create(abbr='AFVD', name='American Football Verband')

        ScheduleTemplate.objects.create(
            name='Standard Format',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            association=association,
        )

        # Creating another template with same name in same association should fail
        with pytest.raises(IntegrityError):
            ScheduleTemplate.objects.create(
                name='Standard Format',
                num_teams=8,
                num_fields=2,
                num_groups=2,
                association=association,
            )

    def test_global_and_association_can_have_same_name(self):
        """Test that global and association templates can share the same name."""
        association = Association.objects.create(abbr='SFL', name='Swiss Flag Football League')

        # Create global template
        global_template = ScheduleTemplate.objects.create(
            name='Standard 6',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            association=None,
        )

        # Create association template with same name - should succeed
        assoc_template = ScheduleTemplate.objects.create(
            name='Standard 6',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            association=association,
        )

        assert global_template.pk != assoc_template.pk
        assert global_template.association is None
        assert assoc_template.association == association

    def test_check_constraint_num_teams_positive(self):
        """Test that num_teams must be positive."""
        with pytest.raises((IntegrityError, ValidationError)):
            template = ScheduleTemplate(
                name='Invalid Teams',
                num_teams=0,  # Invalid - must be > 0
                num_fields=2,
                num_groups=1,
            )
            template.full_clean()  # Trigger validation
            template.save()

    def test_check_constraint_num_fields_positive(self):
        """Test that num_fields must be positive."""
        with pytest.raises((IntegrityError, ValidationError)):
            template = ScheduleTemplate(
                name='Invalid Fields',
                num_teams=6,
                num_fields=0,  # Invalid - must be > 0
                num_groups=2,
            )
            template.full_clean()
            template.save()

    def test_check_constraint_game_duration_range(self):
        """Test that game_duration must be between 30 and 120 minutes."""
        # Too short
        with pytest.raises((IntegrityError, ValidationError)):
            template = ScheduleTemplate(
                name='Too Short',
                num_teams=6,
                num_fields=2,
                num_groups=2,
                game_duration=20,  # Invalid - must be >= 30
            )
            template.full_clean()
            template.save()

        # Too long
        with pytest.raises((IntegrityError, ValidationError)):
            template = ScheduleTemplate(
                name='Too Long',
                num_teams=6,
                num_fields=2,
                num_groups=2,
                game_duration=150,  # Invalid - must be <= 120
            )
            template.full_clean()
            template.save()

    def test_cascade_delete_slots_when_template_deleted(self):
        """Test that slots are deleted when template is deleted."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create some slots
        slot1 = TemplateSlot.objects.create(
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

        template_id = template.pk
        slot1_id = slot1.pk

        # Delete template
        template.delete()

        # Slots should be deleted
        assert not TemplateSlot.objects.filter(pk=slot1_id).exists()
        assert not ScheduleTemplate.objects.filter(pk=template_id).exists()

    def test_ordering_by_created_at_desc(self):
        """Test that templates are ordered by created_at descending."""
        template1 = ScheduleTemplate.objects.create(
            name='First',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )
        template2 = ScheduleTemplate.objects.create(
            name='Second',
            num_teams=8,
            num_fields=3,
            num_groups=2,
        )

        templates = list(ScheduleTemplate.objects.all())
        assert templates[0] == template2  # Most recent first
        assert templates[1] == template1


@pytest.mark.django_db
class TestTemplateSlot:
    """Test TemplateSlot model - individual game slots in a template."""

    def test_create_slot_with_group_team_placeholder(self):
        """Test creating a slot with group/team index placeholders (preliminary rounds)."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot.objects.create(
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
            official_team=2,
            break_after=0,
        )

        assert slot.pk is not None
        assert slot.template == template
        assert slot.field == 1
        assert slot.slot_order == 0
        assert slot.home_group == 0
        assert slot.home_team == 0
        assert slot.home_reference == ''

    def test_create_slot_with_reference_placeholder(self):
        """Test creating a slot with result reference (final rounds)."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage='Finalrunde',
            standing='HF',
            home_group=None,
            home_team=None,
            home_reference='Gewinner HF1',
            away_group=None,
            away_team=None,
            away_reference='Gewinner HF2',
            official_group=None,
            official_team=None,
            official_reference='Gewinner P3',
        )

        assert slot.pk is not None
        assert slot.home_reference == 'Gewinner HF1'
        assert slot.home_group is None
        assert slot.home_team is None

    def test_validation_team_cannot_play_itself(self):
        """Test that a team cannot be both home and away (no self-play)."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=0,  # Same as home - INVALID
            official_group=1,
            official_team=0,
        )

        with pytest.raises(ValidationError, match="cannot play against itself"):
            slot.full_clean()

    def test_validation_home_team_cannot_referee_itself(self):
        """Test that home team cannot referee their own game."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot(
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
            official_team=0,  # Same as home - INVALID
        )

        with pytest.raises(ValidationError, match="cannot referee their own game"):
            slot.full_clean()

    def test_validation_away_team_cannot_referee_itself(self):
        """Test that away team cannot referee their own game."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot(
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
            official_team=1,  # Same as away - INVALID
        )

        with pytest.raises(ValidationError, match="cannot referee their own game"):
            slot.full_clean()

    def test_validation_field_within_template_fields(self):
        """Test that field number doesn't exceed template's num_fields."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,  # Only 2 fields available
            num_groups=2,
        )

        slot = TemplateSlot(
            template=template,
            field=3,  # Invalid - exceeds num_fields
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

        with pytest.raises(ValidationError, match="exceeds template's .* fields"):
            slot.full_clean()

    def test_validation_group_within_template_groups(self):
        """Test that group indices don't exceed template's num_groups."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,  # Only groups 0 and 1 available
        )

        slot = TemplateSlot(
            template=template,
            field=1,
            slot_order=0,
            stage='Vorrunde',
            standing='Gruppe 1',
            home_group=3,  # Invalid - exceeds num_groups
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=1,
            official_team=0,
        )

        with pytest.raises(ValidationError, match="exceeds template's .* groups"):
            slot.full_clean()

    def test_ordering_by_field_and_slot_order(self):
        """Test that slots are ordered by field, then slot_order."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create slots in random order
        slot_f2_s1 = TemplateSlot.objects.create(
            template=template, field=2, slot_order=1, stage='Vorrunde', standing='G1',
            home_group=0, home_team=0, away_group=0, away_team=1, official_group=1, official_team=0,
        )
        slot_f1_s0 = TemplateSlot.objects.create(
            template=template, field=1, slot_order=0, stage='Vorrunde', standing='G1',
            home_group=0, home_team=0, away_group=0, away_team=1, official_group=1, official_team=0,
        )
        slot_f1_s1 = TemplateSlot.objects.create(
            template=template, field=1, slot_order=1, stage='Vorrunde', standing='G1',
            home_group=0, home_team=0, away_group=0, away_team=1, official_group=1, official_team=0,
        )
        slot_f2_s0 = TemplateSlot.objects.create(
            template=template, field=2, slot_order=0, stage='Vorrunde', standing='G1',
            home_group=0, home_team=0, away_group=0, away_team=1, official_group=1, official_team=0,
        )

        slots = list(TemplateSlot.objects.all())
        assert slots == [slot_f1_s0, slot_f1_s1, slot_f2_s0, slot_f2_s1]


@pytest.mark.django_db
class TestTemplateUpdateRule:
    """Test TemplateUpdateRule and TemplateUpdateRuleTeam models - rules for final rounds."""

    def test_create_update_rule_with_team_rules(self):
        """Test creating update rules for final round matchups."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        # Create a final round slot
        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage='Finalrunde',
            standing='HF',
            home_reference='P2 Gruppe 2',
            away_reference='P1 Gruppe 1',
            official_reference='P3 Gruppe 2',
        )

        # Create update rule
        update_rule = TemplateUpdateRule.objects.create(
            template=template,
            slot=slot,
            pre_finished='Vorrunde',
        )

        # Create team rules
        home_rule = TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='home',
            standing='Gruppe 2',
            place=2,
        )

        away_rule = TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='away',
            standing='Gruppe 1',
            place=1,
        )

        official_rule = TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='official',
            standing='Gruppe 2',
            place=3,
        )

        assert update_rule.pk is not None
        assert update_rule.slot == slot
        assert update_rule.template == template
        assert update_rule.pre_finished == 'Vorrunde'
        assert home_rule.role == 'home'
        assert home_rule.place == 2
        assert away_rule.role == 'away'
        assert official_rule.role == 'official'

    def test_update_rule_with_different_official_pre_finished(self):
        """Test that officials can have different pre_finished dependency."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=6,
            stage='Finalrunde',
            standing='P1',
            home_reference='Gewinner HF1',
            away_reference='Gewinner HF2',
            official_reference='Gewinner P3',
        )

        update_rule = TemplateUpdateRule.objects.create(
            template=template,
            slot=slot,
            pre_finished='HF',  # Home/away depend on HF finishing
        )

        home_rule = TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='home',
            standing='HF',
            place=1,
            points=2,  # Winner of HF
        )

        # Officials depend on different stage
        official_rule = TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='official',
            standing='P3',
            place=1,
            points=2,
            pre_finished_override='P3',  # Different dependency
        )

        assert home_rule.pre_finished_override is None or home_rule.pre_finished_override == ''
        assert official_rule.pre_finished_override == 'P3'

    def test_unique_constraint_one_update_rule_per_slot(self):
        """Test that each slot can have only one update rule."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage='Finalrunde',
            standing='HF',
            home_reference='P2 Gruppe 2',
            away_reference='P1 Gruppe 1',
            official_reference='P3 Gruppe 2',
        )

        TemplateUpdateRule.objects.create(
            template=template,
            slot=slot,
            pre_finished='Vorrunde',
        )

        # Creating another update rule for same slot should fail
        with pytest.raises(IntegrityError):
            TemplateUpdateRule.objects.create(
                template=template,
                slot=slot,
                pre_finished='HF',
            )

    def test_unique_constraint_one_team_rule_per_role(self):
        """Test that each role (home/away/official) can have only one team rule."""
        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage='Finalrunde',
            standing='HF',
            home_reference='P2 Gruppe 2',
            away_reference='P1 Gruppe 1',
            official_reference='P3 Gruppe 2',
        )

        update_rule = TemplateUpdateRule.objects.create(
            template=template,
            slot=slot,
            pre_finished='Vorrunde',
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule,
            role='home',
            standing='Gruppe 2',
            place=2,
        )

        # Creating another home rule should fail
        with pytest.raises(IntegrityError):
            TemplateUpdateRuleTeam.objects.create(
                update_rule=update_rule,
                role='home',
                standing='Gruppe 1',
                place=1,
            )


@pytest.mark.django_db
class TestTemplateApplication:
    """Test TemplateApplication model - audit trail for template usage."""

    def test_create_template_application_record(self):
        """Test creating an application record when template is applied to gameday."""
        from gamedays.models import Gameday, Season, League
        import datetime

        user = User.objects.create(username='league_manager')
        association = Association.objects.create(abbr='AFVD', name='American Football Verband')

        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
            association=association,
        )

        season = Season.objects.create(name='2025')
        league = League.objects.create(name='Testliga')
        gameday = Gameday.objects.create(
            name='Test Gameday',
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format='6_2',
            author=user,  # Required field
        )

        # Record application
        application = TemplateApplication.objects.create(
            template=template,
            gameday=gameday,
            applied_by=user,
            team_mapping={'0_0': 1, '0_1': 2, '0_2': 3, '1_0': 4, '1_1': 5, '1_2': 6},
        )

        assert application.pk is not None
        assert application.template == template
        assert application.gameday == gameday
        assert application.applied_by == user
        assert application.applied_at is not None
        assert application.team_mapping == {'0_0': 1, '0_1': 2, '0_2': 3, '1_0': 4, '1_1': 5, '1_2': 6}

    def test_template_application_cascade_on_template_delete(self):
        """Test that application records are deleted when template is deleted."""
        from gamedays.models import Gameday, Season, League
        import datetime

        user = User.objects.create(username='test_user')

        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        season = Season.objects.create(name='2025')
        league = League.objects.create(name='Testliga')
        gameday = Gameday.objects.create(
            name='Test Gameday',
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format='6_2',
            author=user,
        )

        application = TemplateApplication.objects.create(
            template=template,
            gameday=gameday,
            team_mapping={},
        )

        application_id = application.pk
        template.delete()

        # Application should be deleted
        assert not TemplateApplication.objects.filter(pk=application_id).exists()

    def test_template_application_cascade_on_gameday_delete(self):
        """Test that application records are deleted when gameday is deleted."""
        from gamedays.models import Gameday, Season, League
        import datetime

        user = User.objects.create(username='test_user2')

        template = ScheduleTemplate.objects.create(
            name='Test Template',
            num_teams=6,
            num_fields=2,
            num_groups=2,
        )

        season = Season.objects.create(name='2025')
        league = League.objects.create(name='Testliga')
        gameday = Gameday.objects.create(
            name='Test Gameday',
            season=season,
            league=league,
            date=datetime.date.today(),
            start=datetime.time(10, 0),
            format='6_2',
            author=user,
        )

        application = TemplateApplication.objects.create(
            template=template,
            gameday=gameday,
            team_mapping={},
        )

        application_id = application.pk
        gameday.delete()

        # Application should be deleted
        assert not TemplateApplication.objects.filter(pk=application_id).exists()
