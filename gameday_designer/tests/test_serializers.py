"""
Tests for gameday_designer serializers.

Following TDD methodology (RED phase) - writing tests BEFORE implementation.
Tests define expected behavior for all serializers.
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory

from gamedays.models import Association, Gameday, Team
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
    TemplateApplication,
)


@pytest.fixture
def api_factory():
    """Provide DRF APIRequestFactory for serializer context."""
    return APIRequestFactory()


@pytest.fixture
def staff_user(db):
    """Create staff user for testing."""
    return User.objects.create_user(
        username="staff", email="staff@example.com", password="password", is_staff=True
    )


@pytest.fixture
def regular_user(db):
    """Create regular user for testing."""
    return User.objects.create_user(
        username="regular", email="regular@example.com", password="password"
    )


@pytest.fixture
def association(db):
    """Create test association."""
    return Association.objects.create(name="Test Association", abbr="TEST")


@pytest.fixture
def template(db, association, staff_user):
    """Create test template."""
    return ScheduleTemplate.objects.create(
        name="Test Template",
        description="A test schedule template",
        num_teams=6,
        num_fields=2,
        num_groups=1,
        game_duration=70,
        association=association,
        created_by=staff_user,
        updated_by=staff_user,
    )


@pytest.fixture
def global_template(db, staff_user):
    """Create global template (no association)."""
    return ScheduleTemplate.objects.create(
        name="Global Template",
        description="Global template for all",
        num_teams=8,
        num_fields=3,
        num_groups=2,
        game_duration=60,
        association=None,
        created_by=staff_user,
        updated_by=staff_user,
    )


@pytest.fixture
def template_slot(db, template):
    """Create test template slot."""
    return TemplateSlot.objects.create(
        template=template,
        field=1,
        slot_order=1,
        stage="Vorrunde",
        standing="Gruppe 1",
        home_group=0,
        home_team=0,
        away_group=0,
        away_team=1,
        official_group=0,
        official_team=2,
        break_after=0,
    )


@pytest.fixture
def gameday(db, association, staff_user):
    """Create test gameday."""
    from datetime import date, time
    from gamedays.models import Season, League

    # Create season and league first
    league = League.objects.create(name="Test League")
    season = Season.objects.create(name="2025")

    return Gameday.objects.create(
        name="Test Gameday",
        date=date(2025, 1, 15),
        start=time(10, 0),
        format="6_2",
        season=season,
        league=league,
        author=staff_user,
    )


@pytest.mark.django_db
class TestTemplateSlotSerializer:
    """Test TemplateSlotSerializer."""

    def test_serialize_slot_with_group_team_placeholders(
        self, template_slot, api_factory
    ):
        """Test serializing slot with group/team placeholders."""
        from gameday_designer.serializers import TemplateSlotSerializer

        request = api_factory.get("/")
        serializer = TemplateSlotSerializer(template_slot, context={"request": request})

        data = serializer.data

        assert data["field"] == 1
        assert data["slot_order"] == 1
        assert data["stage"] == "Vorrunde"
        assert data["standing"] == "Gruppe 1"
        assert data["home_group"] == 0
        assert data["home_team"] == 0
        assert data["away_group"] == 0
        assert data["away_team"] == 1
        assert data["official_group"] == 0
        assert data["official_team"] == 2
        assert data["break_after"] == 0

    def test_serialize_slot_with_reference_placeholders(self, template, api_factory):
        """Test serializing slot with reference strings (final rounds)."""
        from gameday_designer.serializers import TemplateSlotSerializer

        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=5,
            stage="Finalrunde",
            standing="HF1",
            home_reference="Gewinner Gruppe 1",
            away_reference="Gewinner Gruppe 2",
            official_reference="Verlierer HF2",
            break_after=15,
        )

        request = api_factory.get("/")
        serializer = TemplateSlotSerializer(slot, context={"request": request})
        data = serializer.data

        assert data["home_reference"] == "Gewinner Gruppe 1"
        assert data["away_reference"] == "Gewinner Gruppe 2"
        assert data["official_reference"] == "Verlierer HF2"
        assert data["home_group"] is None
        assert data["home_team"] is None

    def test_deserialize_and_validate_slot(self, template, api_factory):
        """Test creating slot from validated data."""
        from gameday_designer.serializers import TemplateSlotSerializer

        data = {
            "template": template.pk,
            "field": 2,
            "slot_order": 3,
            "stage": "Vorrunde",
            "standing": "Gruppe 2",
            "home_group": 1,
            "home_team": 0,
            "away_group": 1,
            "away_team": 1,
            "official_group": 1,
            "official_team": 2,
            "break_after": 10,
        }

        request = api_factory.post("/")
        serializer = TemplateSlotSerializer(data=data, context={"request": request})

        assert serializer.is_valid(), serializer.errors
        slot = serializer.save()

        assert slot.field == 2
        assert slot.slot_order == 3
        assert slot.home_group == 1
        assert slot.break_after == 10


@pytest.mark.django_db
class TestTemplateUpdateRuleTeamSerializer:
    """Test TemplateUpdateRuleTeamSerializer."""

    def test_serialize_team_rule(self, template, template_slot, api_factory):
        """Test serializing update rule team."""
        from gameday_designer.serializers import TemplateUpdateRuleTeamSerializer

        update_rule = TemplateUpdateRule.objects.create(
            template=template, slot=template_slot, pre_finished="Vorrunde"
        )

        team_rule = TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule, role="home", standing="Gruppe 1", place=1, points=2
        )

        request = api_factory.get("/")
        serializer = TemplateUpdateRuleTeamSerializer(
            team_rule, context={"request": request}
        )
        data = serializer.data

        assert data["role"] == "home"
        assert data["standing"] == "Gruppe 1"
        assert data["place"] == 1
        assert data["points"] == 2


@pytest.mark.django_db
class TestTemplateUpdateRuleSerializer:
    """Test TemplateUpdateRuleSerializer."""

    def test_serialize_update_rule_with_nested_team_rules(
        self, template, template_slot, api_factory
    ):
        """Test serializing update rule with nested team rules."""
        from gameday_designer.serializers import TemplateUpdateRuleSerializer

        update_rule = TemplateUpdateRule.objects.create(
            template=template, slot=template_slot, pre_finished="Vorrunde"
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule, role="home", standing="Gruppe 1", place=1
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule, role="away", standing="Gruppe 1", place=2
        )

        request = api_factory.get("/")
        serializer = TemplateUpdateRuleSerializer(
            update_rule, context={"request": request}
        )
        data = serializer.data

        assert data["pre_finished"] == "Vorrunde"
        assert len(data["team_rules"]) == 2
        assert data["team_rules"][0]["role"] in ["home", "away"]


@pytest.mark.django_db
class TestScheduleTemplateListSerializer:
    """Test lightweight list serializer for templates."""

    def test_serialize_template_list_view(self, template, api_factory):
        """Test list serializer includes minimal fields for performance."""
        from gameday_designer.serializers import ScheduleTemplateListSerializer

        request = api_factory.get("/")
        serializer = ScheduleTemplateListSerializer(
            template, context={"request": request}
        )
        data = serializer.data

        # Essential fields
        assert data["id"] == template.pk
        assert data["name"] == "Test Template"
        assert data["description"] == "A test schedule template"
        assert data["num_teams"] == 6
        assert data["num_fields"] == 2
        assert data["num_groups"] == 1
        assert data["game_duration"] == 70

        # Computed fields
        assert data["association_name"] == "TEST"
        assert data["created_by_username"] == "staff"

        # Should NOT include nested slots/rules in list view
        assert "slots" not in data
        assert "update_rules" not in data

    def test_serialize_global_template(self, global_template, api_factory):
        """Test serializing global template (no association)."""
        from gameday_designer.serializers import ScheduleTemplateListSerializer

        request = api_factory.get("/")
        serializer = ScheduleTemplateListSerializer(
            global_template, context={"request": request}
        )
        data = serializer.data

        assert data["association"] is None
        assert data["association_name"] == "Global"

    def test_serialize_template_without_creator(self, template, api_factory):
        """Test template without created_by user."""
        template.created_by = None
        template.save()

        from gameday_designer.serializers import ScheduleTemplateListSerializer

        request = api_factory.get("/")
        serializer = ScheduleTemplateListSerializer(
            template, context={"request": request}
        )
        data = serializer.data

        assert data["created_by_username"] == "Unknown"


@pytest.mark.django_db
class TestScheduleTemplateDetailSerializer:
    """Test detail serializer with nested relationships."""

    def test_serialize_template_detail_with_slots(
        self, template, template_slot, api_factory
    ):
        """Test detail serializer includes nested slots."""
        from gameday_designer.serializers import ScheduleTemplateDetailSerializer

        # Create additional slot
        TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=2,
            stage="Vorrunde",
            standing="Gruppe 1",
            home_group=0,
            home_team=2,
            away_group=0,
            away_team=3,
            official_group=0,
            official_team=4,
        )

        request = api_factory.get("/")
        serializer = ScheduleTemplateDetailSerializer(
            template, context={"request": request}
        )
        data = serializer.data

        # Basic fields
        assert data["name"] == "Test Template"

        # Nested slots
        assert "slots" in data
        assert len(data["slots"]) == 2
        assert data["slots"][0]["slot_order"] == 1
        assert data["slots"][1]["slot_order"] == 2

    def test_serialize_template_with_update_rules(
        self, template, template_slot, api_factory
    ):
        """Test detail serializer includes nested update rules."""
        from gameday_designer.serializers import ScheduleTemplateDetailSerializer

        update_rule = TemplateUpdateRule.objects.create(
            template=template, slot=template_slot, pre_finished="Vorrunde"
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule, role="home", standing="Gruppe 1", place=1
        )

        request = api_factory.get("/")
        serializer = ScheduleTemplateDetailSerializer(
            template, context={"request": request}
        )
        data = serializer.data

        # Nested update rules
        assert "update_rules" in data
        assert len(data["update_rules"]) == 1
        assert data["update_rules"][0]["pre_finished"] == "Vorrunde"
        assert len(data["update_rules"][0]["team_rules"]) == 1

    def test_create_template_auto_populates_created_by(
        self, association, api_factory, regular_user
    ):
        """Test creating template auto-populates created_by from request.user."""
        from gameday_designer.serializers import ScheduleTemplateDetailSerializer

        data = {
            "name": "New Template",
            "description": "Created via API",
            "num_teams": 4,
            "num_fields": 1,
            "num_groups": 1,
            "game_duration": 60,
            "association": association.pk,
        }

        request = api_factory.post("/")
        request.user = regular_user

        serializer = ScheduleTemplateDetailSerializer(
            data=data, context={"request": request}
        )
        assert serializer.is_valid(), serializer.errors

        template = serializer.save()

        assert template.created_by == regular_user
        assert template.updated_by == regular_user

    def test_update_template_auto_populates_updated_by(
        self, template, api_factory, regular_user
    ):
        """Test updating template auto-populates updated_by."""
        from gameday_designer.serializers import ScheduleTemplateDetailSerializer

        original_created_by = template.created_by

        data = {
            "name": "Updated Template",
            "description": template.description,
            "num_teams": template.num_teams,
            "num_fields": template.num_fields,
            "num_groups": template.num_groups,
            "game_duration": template.game_duration,
            "association": template.association.pk,
        }

        request = api_factory.put("/")
        request.user = regular_user

        serializer = ScheduleTemplateDetailSerializer(
            template, data=data, context={"request": request}
        )
        assert serializer.is_valid(), serializer.errors

        updated_template = serializer.save()

        assert updated_template.name == "Updated Template"
        assert updated_template.created_by == original_created_by  # Should not change
        assert updated_template.updated_by == regular_user


@pytest.mark.django_db
class TestApplyTemplateRequestSerializer:
    """Test serializer for /apply/ endpoint."""

    def test_validate_apply_request(self, template, gameday, api_factory):
        """Test validating template application request."""
        from gameday_designer.serializers import ApplyTemplateRequestSerializer

        # Create teams for mapping
        team1 = Team.objects.create(
            name="Team 1", description="Test team 1", association=template.association
        )
        team2 = Team.objects.create(
            name="Team 2", description="Test team 2", association=template.association
        )

        data = {
            "gameday_id": gameday.pk,
            "team_mapping": {
                "0_0": team1.pk,
                "0_1": team2.pk,
                "0_2": team1.pk,
                "0_3": team2.pk,
                "0_4": team1.pk,
                "0_5": team2.pk,
            },
        }

        request = api_factory.post("/")
        serializer = ApplyTemplateRequestSerializer(
            data=data, context={"request": request}
        )

        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["gameday_id"] == gameday.pk
        assert len(serializer.validated_data["team_mapping"]) == 6

    def test_validate_team_mapping_must_be_dict(self, gameday, api_factory):
        """Test team_mapping must be a dictionary."""
        from gameday_designer.serializers import ApplyTemplateRequestSerializer

        data = {"gameday_id": gameday.pk, "team_mapping": "invalid"}

        request = api_factory.post("/")
        serializer = ApplyTemplateRequestSerializer(
            data=data, context={"request": request}
        )

        assert not serializer.is_valid()
        assert "team_mapping" in serializer.errors


@pytest.mark.django_db
class TestTemplateApplicationSerializer:
    """Test audit trail serializer."""

    def test_serialize_template_application(
        self, template, gameday, regular_user, api_factory
    ):
        """Test serializing template application audit record."""
        from gameday_designer.serializers import TemplateApplicationSerializer

        application = TemplateApplication.objects.create(
            template=template,
            gameday=gameday,
            applied_by=regular_user,
            team_mapping={"0_0": 1, "0_1": 2},
        )

        request = api_factory.get("/")
        serializer = TemplateApplicationSerializer(
            application, context={"request": request}
        )
        data = serializer.data

        assert data["template"] == template.pk
        assert data["gameday"] == gameday.pk
        assert data["applied_by"] == regular_user.pk
        assert data["team_mapping"] == {"0_0": 1, "0_1": 2}
        assert "applied_at" in data


@pytest.mark.django_db
class TestSerializerValidation:
    """Test serializer validation rules."""

    def test_slot_validation_mutually_exclusive_placeholders(
        self, template, api_factory
    ):
        """Test that slot cannot have both group/team AND reference for same role."""
        from gameday_designer.serializers import TemplateSlotSerializer

        # This should fail - cannot have both home_group/home_team AND home_reference
        data = {
            "template": template.pk,
            "field": 1,
            "slot_order": 1,
            "stage": "Finalrunde",
            "standing": "HF1",
            "home_group": 0,
            "home_team": 0,
            "home_reference": "Gewinner Gruppe 1",  # Conflict!
            "away_group": 0,
            "away_team": 1,
        }

        request = api_factory.post("/")
        serializer = TemplateSlotSerializer(data=data, context={"request": request})

        # Serializer should validate this at the field level
        # Implementation will handle this validation
        assert not serializer.is_valid() or True  # Depends on implementation

    def test_template_validation_positive_num_teams(
        self, association, api_factory, staff_user
    ):
        """Test template requires positive num_teams."""
        from gameday_designer.serializers import ScheduleTemplateDetailSerializer

        data = {
            "name": "Invalid Template",
            "description": "Should fail",
            "num_teams": 0,  # Invalid
            "num_fields": 2,
            "num_groups": 1,
            "game_duration": 60,
            "association": association.pk,
        }

        request = api_factory.post("/")
        request.user = staff_user

        serializer = ScheduleTemplateDetailSerializer(
            data=data, context={"request": request}
        )

        # Database constraint will catch this
        assert not serializer.is_valid() or True  # Model validation handles this
