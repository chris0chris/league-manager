"""
Tests for gameday_designer API endpoints.

Following TDD methodology (RED phase) - writing tests BEFORE ViewSet implementation.
Tests define expected API behavior for all endpoints and actions.
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from gamedays.models import Association, Gameday, Team, Season, League
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
    TemplateApplication,
)


@pytest.mark.django_db
class TestTemplateListEndpoint:
    """Test GET /api/designer/templates/ (list)."""

    def test_anonymous_can_list_templates(self, api_client, template, global_template):
        """Anonymous users can list templates."""
        response = api_client.get("/api/designer/templates/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2  # At least our two fixtures

    def test_list_returns_lightweight_serializer(self, api_client, template_with_slots):
        """List endpoint uses lightweight serializer (no nested data)."""
        response = api_client.get("/api/designer/templates/")

        assert response.status_code == status.HTTP_200_OK
        template_data = next(
            (t for t in response.data if t["id"] == template_with_slots.pk), None
        )

        assert template_data is not None
        assert "name" in template_data
        assert "association_name" in template_data
        assert "slots" not in template_data  # Not in list view
        assert "update_rules" not in template_data  # Not in list view

    def test_staff_sees_all_templates(
        self, api_client, staff_user, template, global_template
    ):
        """Staff users see all templates."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.get("/api/designer/templates/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2

    def test_filtering_by_association(self, api_client, template, global_template):
        """Can filter templates by association."""
        response = api_client.get(
            f"/api/designer/templates/?association={template.association.pk}"
        )

        assert response.status_code == status.HTTP_200_OK
        # Should only return templates for that association
        for t in response.data:
            if t["association"] is not None:
                assert t["association"] == template.association.pk


@pytest.mark.django_db
class TestTemplateDetailEndpoint:
    """Test GET /api/designer/templates/{id}/ (retrieve)."""

    def test_anonymous_can_retrieve_template(self, api_client, template_with_slots):
        """Anonymous users can retrieve template details."""
        response = api_client.get(f"/api/designer/templates/{template_with_slots.pk}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == template_with_slots.pk
        assert response.data["name"] == "Test Template"

    def test_detail_includes_nested_slots(self, api_client, template_with_slots):
        """Detail endpoint includes nested slots."""
        response = api_client.get(f"/api/designer/templates/{template_with_slots.pk}/")

        assert response.status_code == status.HTTP_200_OK
        assert "slots" in response.data
        assert len(response.data["slots"]) == 2
        assert response.data["slots"][0]["slot_order"] == 1

    def test_detail_includes_nested_update_rules(self, api_client, template, db):
        """Detail endpoint includes nested update rules."""
        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Finalrunde",
            standing="Finale",
            home_reference="Gewinner HF1",
            away_reference="Gewinner HF2",
        )

        update_rule = TemplateUpdateRule.objects.create(
            template=template, slot=slot, pre_finished="Halbfinale"
        )

        TemplateUpdateRuleTeam.objects.create(
            update_rule=update_rule, role="home", standing="HF1", place=1
        )

        response = api_client.get(f"/api/designer/templates/{template.pk}/")

        assert response.status_code == status.HTTP_200_OK
        assert "update_rules" in response.data
        assert len(response.data["update_rules"]) == 1
        assert response.data["update_rules"][0]["pre_finished"] == "Halbfinale"

    def test_retrieve_nonexistent_template_returns_404(self, api_client):
        """Retrieving non-existent template returns 404."""
        response = api_client.get("/api/designer/templates/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTemplateCreateEndpoint:
    """Test POST /api/designer/templates/ (create)."""

    def test_anonymous_cannot_create_template(self, api_client, association):
        """Anonymous users cannot create templates."""
        data = {
            "name": "New Template",
            "description": "Should fail",
            "num_teams": 6,
            "num_fields": 2,
            "num_groups": 1,
            "game_duration": 70,
            "association": association.pk,
        }

        response = api_client.post("/api/designer/templates/", data, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_staff_can_create_template(self, api_client, staff_user, association):
        """Staff users can create templates."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "name": "Staff Template",
            "description": "Created by staff",
            "num_teams": 4,
            "num_fields": 1,
            "num_groups": 1,
            "game_duration": 60,
            "association": association.pk,
        }

        response = api_client.post("/api/designer/templates/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Staff Template"
        assert response.data["created_by"] == staff_user.pk
        assert response.data["updated_by"] == staff_user.pk

    def test_staff_can_create_global_template(self, api_client, staff_user):
        """Staff users can create global templates."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "name": "Global Template",
            "description": "For all associations",
            "num_teams": 8,
            "num_fields": 3,
            "num_groups": 2,
            "game_duration": 60,
            "association": None,
        }

        response = api_client.post("/api/designer/templates/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["association"] is None
        assert response.data["association_name"] == "Global"

    def test_association_user_can_create_template(
        self, api_client, association_user, association
    ):
        """Association users can create templates."""
        api_client.force_authenticate(user=association_user)

        data = {
            "name": "User Template",
            "description": "Created by association user",
            "num_teams": 6,
            "num_fields": 2,
            "num_groups": 1,
            "game_duration": 70,
            "association": association.pk,
        }

        response = api_client.post("/api/designer/templates/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["created_by"] == association_user.pk

    def test_create_validates_required_fields(self, api_client, staff_user):
        """Creating template validates required fields."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "name": "Incomplete Template",
            # Missing required fields
        }

        response = api_client.post("/api/designer/templates/", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "num_teams" in response.data or "non_field_errors" in response.data


@pytest.mark.django_db
class TestTemplateUpdateEndpoint:
    """Test PUT/PATCH /api/designer/templates/{id}/ (update)."""

    def test_anonymous_cannot_update_template(self, api_client, template):
        """Anonymous users cannot update templates."""
        data = {
            "name": "Updated Name",
            "description": template.description,
            "num_teams": template.num_teams,
            "num_fields": template.num_fields,
            "num_groups": template.num_groups,
            "game_duration": template.game_duration,
            "association": template.association.pk,
        }

        response = api_client.put(
            f"/api/designer/templates/{template.pk}/", data, format="json"
        )

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_staff_can_update_any_template(self, api_client, staff_user, template):
        """Staff users can update any template."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "name": "Updated by Staff",
            "description": template.description,
            "num_teams": template.num_teams,
            "num_fields": template.num_fields,
            "num_groups": template.num_groups,
            "game_duration": template.game_duration,
            "association": template.association.pk,
        }

        response = api_client.put(
            f"/api/designer/templates/{template.pk}/", data, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated by Staff"
        assert response.data["updated_by"] == staff_user.pk

    def test_partial_update_with_patch(self, api_client, staff_user, template):
        """PATCH allows partial updates."""
        api_client.force_authenticate(user=staff_user)

        data = {"description": "Partially updated description"}

        response = api_client.patch(
            f"/api/designer/templates/{template.pk}/", data, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Partially updated description"
        assert response.data["name"] == template.name  # Unchanged

    def test_association_user_can_update_association_template(
        self, api_client, association_user, template
    ):
        """Association users can update templates for their association."""
        api_client.force_authenticate(user=association_user)

        data = {
            "name": "Updated by User",
            "description": template.description,
            "num_teams": template.num_teams,
            "num_fields": template.num_fields,
            "num_groups": template.num_groups,
            "game_duration": template.game_duration,
            "association": template.association.pk,
        }

        response = api_client.put(
            f"/api/designer/templates/{template.pk}/", data, format="json"
        )

        # Permission allows this
        assert response.status_code == status.HTTP_200_OK

    def test_association_user_cannot_update_global_template(
        self, api_client, association_user, global_template
    ):
        """Association users cannot update global templates."""
        api_client.force_authenticate(user=association_user)

        data = {
            "name": "Trying to update",
            "description": global_template.description,
            "num_teams": global_template.num_teams,
            "num_fields": global_template.num_fields,
            "num_groups": global_template.num_groups,
            "game_duration": global_template.game_duration,
            "association": None,
        }

        response = api_client.put(
            f"/api/designer/templates/{global_template.pk}/", data, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTemplateDeleteEndpoint:
    """Test DELETE /api/designer/templates/{id}/ (delete)."""

    def test_anonymous_cannot_delete_template(self, api_client, template):
        """Anonymous users cannot delete templates."""
        response = api_client.delete(f"/api/designer/templates/{template.pk}/")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_staff_can_delete_template(self, api_client, staff_user, template):
        """Staff users can delete templates."""
        api_client.force_authenticate(user=staff_user)

        template_pk = template.pk
        response = api_client.delete(f"/api/designer/templates/{template_pk}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ScheduleTemplate.objects.filter(pk=template_pk).exists()

    def test_association_user_cannot_delete_template(
        self, api_client, association_user, template
    ):
        """Association users cannot delete templates."""
        api_client.force_authenticate(user=association_user)

        response = api_client.delete(f"/api/designer/templates/{template.pk}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert ScheduleTemplate.objects.filter(pk=template.pk).exists()


@pytest.mark.django_db
class TestTemplateApplyEndpoint:
    """Test POST /api/designer/templates/{id}/apply/ (custom action)."""

    def test_anonymous_cannot_apply_template(
        self, api_client, template_with_slots, gameday, teams
    ):
        """Anonymous users cannot apply templates."""
        data = {
            "gameday_id": gameday.pk,
            "team_mapping": {
                "0_0": teams[0].pk,
                "0_1": teams[1].pk,
                "0_2": teams[2].pk,
                "0_3": teams[3].pk,
                "0_4": teams[4].pk,
                "0_5": teams[5].pk,
            },
        }

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/apply/",
            data,
            format="json",
        )

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_staff_can_apply_template(
        self, api_client, staff_user, template_with_slots, gameday, teams
    ):
        """Staff users can apply templates."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "gameday_id": gameday.pk,
            "team_mapping": {
                "0_0": teams[0].pk,
                "0_1": teams[1].pk,
                "0_2": teams[2].pk,
                "0_3": teams[3].pk,
                "0_4": teams[4].pk,
                "0_5": teams[5].pk,
            },
        }

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/apply/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "success" in response.data
        assert response.data["success"] is True

    def test_association_user_can_apply_template(
        self, api_client, association_user, template_with_slots, gameday, teams
    ):
        """Association users can apply templates."""
        api_client.force_authenticate(user=association_user)

        data = {
            "gameday_id": gameday.pk,
            "team_mapping": {
                "0_0": teams[0].pk,
                "0_1": teams[1].pk,
                "0_2": teams[2].pk,
                "0_3": teams[3].pk,
                "0_4": teams[4].pk,
                "0_5": teams[5].pk,
            },
        }

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/apply/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

    def test_apply_validates_gameday_exists(
        self, api_client, staff_user, template_with_slots, teams
    ):
        """Apply endpoint validates gameday exists."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "gameday_id": 99999,  # Non-existent
            "team_mapping": {
                "0_0": teams[0].pk,
                "0_1": teams[1].pk,
                "0_2": teams[2].pk,
                "0_3": teams[3].pk,
                "0_4": teams[4].pk,
                "0_5": teams[5].pk,
            },
        }

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/apply/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_apply_creates_audit_record(
        self, api_client, staff_user, template_with_slots, gameday, teams
    ):
        """Applying template creates TemplateApplication audit record."""
        api_client.force_authenticate(user=staff_user)

        data = {
            "gameday_id": gameday.pk,
            "team_mapping": {
                "0_0": teams[0].pk,
                "0_1": teams[1].pk,
                "0_2": teams[2].pk,
                "0_3": teams[3].pk,
                "0_4": teams[4].pk,
                "0_5": teams[5].pk,
            },
        }

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/apply/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        # Check audit record created
        application = TemplateApplication.objects.filter(
            template=template_with_slots, gameday=gameday
        ).first()

        assert application is not None
        assert application.applied_by == staff_user


@pytest.mark.django_db
class TestTemplateCloneEndpoint:
    """Test POST /api/designer/templates/{id}/clone/ (custom action)."""

    def test_anonymous_cannot_clone_template(self, api_client, template):
        """Anonymous users cannot clone templates."""
        response = api_client.post(
            f"/api/designer/templates/{template.pk}/clone/", format="json"
        )

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_staff_can_clone_template(
        self, api_client, staff_user, template_with_slots
    ):
        """Staff users can clone templates."""
        api_client.force_authenticate(user=staff_user)

        original_count = ScheduleTemplate.objects.count()

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/clone/", format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert ScheduleTemplate.objects.count() == original_count + 1
        assert response.data["name"].startswith("Copy of ")

    def test_clone_includes_slots(self, api_client, staff_user, template_with_slots):
        """Cloning template copies slots."""
        api_client.force_authenticate(user=staff_user)

        original_slot_count = template_with_slots.slots.count()

        response = api_client.post(
            f"/api/designer/templates/{template_with_slots.pk}/clone/", format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED

        cloned_template = ScheduleTemplate.objects.get(pk=response.data["id"])
        assert cloned_template.slots.count() == original_slot_count

    def test_association_user_can_clone_template(
        self, api_client, association_user, template
    ):
        """Association users can clone templates."""
        api_client.force_authenticate(user=association_user)

        response = api_client.post(
            f"/api/designer/templates/{template.pk}/clone/", format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestTemplateValidateEndpoint:
    """Test GET /api/designer/templates/{id}/validate/ (custom action)."""

    def test_anyone_can_validate_template(self, api_client, template_with_slots):
        """Anyone can validate templates (even anonymous)."""
        response = api_client.get(
            f"/api/designer/templates/{template_with_slots.pk}/validate/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert "is_valid" in response.data
        assert "errors" in response.data
        assert "warnings" in response.data

    def test_validate_returns_validation_result(self, api_client, template_with_slots):
        """Validate endpoint returns validation result from service."""
        response = api_client.get(
            f"/api/designer/templates/{template_with_slots.pk}/validate/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data["is_valid"], bool)
        assert isinstance(response.data["errors"], list)
        assert isinstance(response.data["warnings"], list)


@pytest.mark.django_db
class TestTemplatePreviewEndpoint:
    """Test GET /api/designer/templates/{id}/preview/ (custom action)."""

    def test_anyone_can_preview_template(self, api_client, template_with_slots):
        """Anyone can preview template schedule."""
        response = api_client.get(
            f"/api/designer/templates/{template_with_slots.pk}/preview/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert "slots" in response.data
        assert len(response.data["slots"]) == 2

    def test_preview_includes_slot_details(self, api_client, template_with_slots):
        """Preview includes detailed slot information."""
        response = api_client.get(
            f"/api/designer/templates/{template_with_slots.pk}/preview/"
        )

        assert response.status_code == status.HTTP_200_OK

        first_slot = response.data["slots"][0]
        assert "field" in first_slot
        assert "slot_order" in first_slot
        assert "stage" in first_slot
        assert "standing" in first_slot


@pytest.mark.django_db
class TestTemplateUsageEndpoint:
    """Test GET /api/designer/templates/{id}/usage/ (custom action)."""

    def test_anyone_can_view_usage_statistics(self, api_client, template):
        """Anyone can view template usage statistics."""
        response = api_client.get(f"/api/designer/templates/{template.pk}/usage/")

        assert response.status_code == status.HTTP_200_OK
        assert "applications_count" in response.data
        assert "recent_applications" in response.data

    def test_usage_shows_application_count(
        self, api_client, template, gameday, staff_user
    ):
        """Usage endpoint shows number of applications."""
        # Create some applications
        TemplateApplication.objects.create(
            template=template, gameday=gameday, applied_by=staff_user, team_mapping={}
        )

        response = api_client.get(f"/api/designer/templates/{template.pk}/usage/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["applications_count"] >= 1
